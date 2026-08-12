import type {
	FuelPriceSummary,
	GasBrand,
	GasPriceSnapshot,
	GasPriceSitemapEntry,
} from '../model/types';

const DIRECTUS_URL = (
	process.env.DIRECTUS_URL ||
	process.env.PUBLIC_DIRECTUS_URL ||
	import.meta.env.PUBLIC_DIRECTUS_URL ||
	'https://api.za-rulem.org'
).replace(/\/$/, '');
const DIRECTUS_TOKEN = process.env.DIRECTUS_GAS_PRICES_TOKEN || '';
const REQUEST_TIMEOUT_MS = 10_000;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null;

const stringValue = (value: unknown): string => typeof value === 'string' ? value : '';
const numberValue = (value: unknown): number => Number.isFinite(Number(value)) ? Number(value) : 0;

const parseFuel = (value: unknown): FuelPriceSummary | null => {
	if (!isRecord(value)) return null;
	const fuelType = stringValue(value.fuelType ?? value.fuel_type);
	const updatedAt = stringValue(value.updatedAt ?? value.updated_at);
	const average = numberValue(value.average);
	if (!fuelType || !updatedAt || average <= 0) return null;
	return {
		fuelType,
		average,
		min: numberValue(value.min),
		max: numberValue(value.max),
		sampleCount: numberValue(value.sampleCount ?? value.sample_count),
		updatedAt,
	};
};

const parseBrand = (value: unknown): GasBrand | null => {
	if (!isRecord(value)) return null;
	const slug = stringValue(value.slug);
	const name = stringValue(value.name);
	if (!slug || !name) return null;
	const aliases = Array.isArray(value.aliases)
		? value.aliases.filter((alias): alias is string => typeof alias === 'string')
		: [];
	return {
		slug,
		name,
		aliases,
		isIndexable: value.is_indexable === true,
		verificationStatus: value.verification_status === 'verified' ? 'verified' : 'unverified',
	};
};

const parseSnapshot = (value: unknown): GasPriceSnapshot | null => {
	if (!isRecord(value)) return null;
	const citySlug = stringValue(value.city_slug);
	const brandSlug = stringValue(value.brand_slug);
	const snapshotDate = stringValue(value.snapshot_date);
	const fuels = Array.isArray(value.fuel_prices)
		? value.fuel_prices.map(parseFuel).filter((fuel): fuel is FuelPriceSummary => fuel !== null)
		: [];
	if (!citySlug || !brandSlug || !snapshotDate) return null;
	return {
		id: typeof value.id === 'string' || typeof value.id === 'number' ? value.id : undefined,
		citySlug,
		brandSlug,
		snapshotDate,
		stationCount: numberValue(value.station_count),
		sourceUpdatedAt: stringValue(value.source_updated_at),
		createdAt: stringValue(value.date_created) || undefined,
		fuels,
	};
};

const parseSitemapEntry = (value: unknown): GasPriceSitemapEntry | null => {
	if (!isRecord(value) || !isRecord(value.count) || !isRecord(value.max)) return null;
	const citySlug = stringValue(value.city_slug);
	const brandSlug = stringValue(value.brand_slug);
	const latestSnapshotDate = stringValue(value.max.snapshot_date);
	const sourceUpdatedAt = stringValue(value.max.source_updated_at);
	const snapshotCount = numberValue(value.count.id);
	if (!citySlug || !brandSlug || !latestSnapshotDate || snapshotCount < 1) return null;
	return { citySlug, brandSlug, snapshotCount, latestSnapshotDate, sourceUpdatedAt };
};

const request = async (path: string, init?: RequestInit): Promise<unknown> => {
	const headers = new Headers(init?.headers);
	headers.set('Accept', 'application/json');
	if (init?.body) headers.set('Content-Type', 'application/json');
	if (DIRECTUS_TOKEN) headers.set('Authorization', `Bearer ${DIRECTUS_TOKEN}`);
	const response = await fetch(`${DIRECTUS_URL}${path}`, {
		...init,
		headers,
		signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
	});
	if (!response.ok) throw new Error(`Directus gas prices request failed: ${response.status}`);
	return response.status === 204 ? null : response.json();
};

const dataItems = (payload: unknown): unknown[] =>
	isRecord(payload) && Array.isArray(payload.data) ? payload.data : [];

export const readGasBrands = async (): Promise<GasBrand[]> => {
	const payload = await request(
		'/items/gas_brands?limit=-1&fields=slug,name,aliases,is_indexable,verification_status&filter[status][_eq]=published',
	);
	return dataItems(payload).map(parseBrand).filter((brand): brand is GasBrand => brand !== null);
};

export const readCitySnapshots = async (
	citySlug: string,
	limit = 1000,
): Promise<GasPriceSnapshot[]> => {
	const params = new URLSearchParams({
		limit: String(limit),
		fields: 'id,city_slug,brand_slug,snapshot_date,station_count,source_updated_at,fuel_prices,date_created',
		sort: '-snapshot_date',
	});
	params.set('filter[city_slug][_eq]', citySlug);
	const payload = await request(`/items/gas_price_daily?${params.toString()}`);
	return dataItems(payload).map(parseSnapshot).filter((item): item is GasPriceSnapshot => item !== null);
};

export const readBrandHistory = async (
	citySlug: string,
	brandSlug: string,
	page: number,
	perPage: number,
): Promise<{ items: GasPriceSnapshot[]; total: number }> => {
	const params = new URLSearchParams({
		limit: String(perPage),
		offset: String((page - 1) * perPage),
		fields: 'id,city_slug,brand_slug,snapshot_date,station_count,source_updated_at,fuel_prices,date_created',
		sort: '-snapshot_date',
		'meta': 'filter_count',
	});
	params.set('filter[city_slug][_eq]', citySlug);
	params.set('filter[brand_slug][_eq]', brandSlug);
	const payload = await request(`/items/gas_price_daily?${params.toString()}`);
	const total = isRecord(payload) && isRecord(payload.meta)
		? numberValue(payload.meta.filter_count)
		: 0;
	return {
		items: dataItems(payload).map(parseSnapshot).filter((item): item is GasPriceSnapshot => item !== null),
		total,
	};
};

export const readBrandCitySlugs = async (brandSlug: string): Promise<string[]> => {
	const params = new URLSearchParams({ limit: '-1', fields: 'city_slug' });
	params.set('filter[brand_slug][_eq]', brandSlug);
	const payload = await request(`/items/gas_price_daily?${params.toString()}`);
	return [...new Set(dataItems(payload)
		.map((item) => isRecord(item) ? stringValue(item.city_slug) : '')
		.filter(Boolean))];
};

/**
 * Возвращает одну агрегированную запись на город и сеть. В sitemap не нужны
 * fuel_prices: с получасовой историей их загрузка раздувает ответ на мегабайты.
 */
export const readGasPriceSitemapEntries = async (since: string): Promise<GasPriceSitemapEntry[]> => {
	const params = new URLSearchParams({ limit: '-1' });
	params.append('aggregate[count]', 'id');
	params.append('aggregate[max]', 'snapshot_date');
	params.append('aggregate[max]', 'source_updated_at');
	params.append('groupBy[]', 'city_slug');
	params.append('groupBy[]', 'brand_slug');
	params.set('filter[snapshot_date][_gte]', since);
	const payload = await request(`/items/gas_price_daily?${params.toString()}`);
	return dataItems(payload)
		.map(parseSitemapEntry)
		.filter((item): item is GasPriceSitemapEntry => item !== null);
};

export const ensureGasBrand = async (brand: GasBrand): Promise<void> => {
	if (!DIRECTUS_TOKEN) throw new Error('DIRECTUS_GAS_PRICES_TOKEN is not configured');
	const params = new URLSearchParams({ limit: '1', fields: 'id' });
	params.set('filter[slug][_eq]', brand.slug);
	const existing = dataItems(await request(`/items/gas_brands?${params.toString()}`));
	if (existing.length > 0) return;
	await request('/items/gas_brands', {
		method: 'POST',
		body: JSON.stringify({
			slug: brand.slug,
			name: brand.name,
			aliases: brand.aliases,
			is_indexable: brand.isIndexable,
			verification_status: brand.verificationStatus,
			status: 'published',
		}),
	});
};

export const upsertGasPriceSnapshot = async (snapshot: GasPriceSnapshot): Promise<void> => {
	if (!DIRECTUS_TOKEN) throw new Error('DIRECTUS_GAS_PRICES_TOKEN is not configured');
	const params = new URLSearchParams({ limit: '1', fields: 'id' });
	params.set('filter[city_slug][_eq]', snapshot.citySlug);
	params.set('filter[brand_slug][_eq]', snapshot.brandSlug);
	params.set('filter[snapshot_date][_eq]', snapshot.snapshotDate);
	const [existing] = dataItems(await request(`/items/gas_price_daily?${params.toString()}`));
	const body = JSON.stringify({
		city_slug: snapshot.citySlug,
		brand_slug: snapshot.brandSlug,
		snapshot_date: snapshot.snapshotDate,
		station_count: snapshot.stationCount,
		source_updated_at: snapshot.sourceUpdatedAt,
		fuel_prices: snapshot.fuels,
	});
	if (isRecord(existing) && (typeof existing.id === 'string' || typeof existing.id === 'number')) {
		await request(`/items/gas_price_daily/${encodeURIComponent(String(existing.id))}`, { method: 'PATCH', body });
		return;
	}
	await request('/items/gas_price_daily', { method: 'POST', body });
};
