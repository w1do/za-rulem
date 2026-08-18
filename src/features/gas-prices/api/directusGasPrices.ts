import type { GasBrand, GasPriceSitemapEntry, GasPriceSnapshot } from '../model/types';
import {
	readDataItems,
	readMetaCount,
	readRecordString,
	toGasBrand,
	toGasPriceSitemapEntry,
	toGasPriceSnapshot,
} from './dto';

const DIRECTUS_URL = (
	process.env.DIRECTUS_URL ||
	process.env.PUBLIC_DIRECTUS_URL ||
	import.meta.env.PUBLIC_DIRECTUS_URL ||
	'https://api.za-rulem.org'
).replace(/\/$/, '');
const DIRECTUS_TOKEN = process.env.DIRECTUS_GAS_PRICES_TOKEN || '';
const REQUEST_TIMEOUT_MS = 10_000;
const CATALOG_REQUEST_TIMEOUT_MS = 20_000;
/** Агрегация для sitemap идёт по всей двухнедельной истории и требует больше времени. */
const SITEMAP_REQUEST_TIMEOUT_MS = 60_000;

const SNAPSHOT_FIELDS =
	'id,area_type,area_slug,brand_slug,snapshot_date,station_count,source_updated_at,fuel_prices,date_created';

const request = async (path: string, timeoutMs = REQUEST_TIMEOUT_MS): Promise<unknown> => {
	const headers = new Headers({ Accept: 'application/json' });
	if (DIRECTUS_TOKEN) headers.set('Authorization', `Bearer ${DIRECTUS_TOKEN}`);
	const response = await fetch(`${DIRECTUS_URL}${path}`, {
		headers,
		signal: AbortSignal.timeout(timeoutMs),
	});
	if (!response.ok) throw new Error(`Directus gas prices request failed: ${response.status}`);
	return response.status === 204 ? null : response.json();
};

const mapSnapshots = (payload: unknown): GasPriceSnapshot[] =>
	readDataItems(payload)
		.map(toGasPriceSnapshot)
		.filter((item): item is GasPriceSnapshot => item !== null);

export const readGasBrands = async (): Promise<GasBrand[]> => {
	// Коллекция gas_brands удалена, бренды теперь берутся из DEFAULT_GAS_BRANDS в aggregate.ts
	return [];
};

/**
 * История города за последние снимки: из неё выводятся и текущая цена
 * (самый свежий снимок), и динамика по сетям.
 */
export const readCitySnapshots = async (
	areaSlug: string,
	limit = 1000,
): Promise<GasPriceSnapshot[]> => {
	const params = new URLSearchParams({
		limit: String(limit),
		fields: SNAPSHOT_FIELDS,
		sort: '-snapshot_date',
	});
	params.set('filter[area_slug][_eq]', areaSlug);
	params.set('filter[area_type][_eq]', 'city');
	return mapSnapshots(await request(`/items/gas_daily?${params.toString()}`));
};

/**
 * Один запрос для каталога городов вместо последовательного чтения истории
 * каждого города. Ограничение по дате сохраняет ответ компактным, но оставляет
 * предыдущий снимок, необходимый для расчёта динамики.
 */
export const readRecentCitySnapshots = async (since: string): Promise<GasPriceSnapshot[]> => {
	const params = new URLSearchParams({
		limit: '-1',
		fields: SNAPSHOT_FIELDS,
		sort: 'area_slug,brand_slug,snapshot_date',
	});
	params.set('filter[area_type][_eq]', 'city');
	params.set('filter[snapshot_date][_gte]', since);
	return mapSnapshots(
		await request(`/items/gas_daily?${params.toString()}`, CATALOG_REQUEST_TIMEOUT_MS),
	);
};

export const readBrandHistory = async (
	areaSlug: string,
	brandSlug: string,
	page: number,
	perPage: number,
): Promise<{ items: GasPriceSnapshot[]; total: number }> => {
	const params = new URLSearchParams({
		limit: String(perPage),
		offset: String((page - 1) * perPage),
		fields: SNAPSHOT_FIELDS,
		sort: '-snapshot_date',
		meta: 'filter_count',
	});
	params.set('filter[area_slug][_eq]', areaSlug);
	params.set('filter[brand_slug][_eq]', brandSlug);
	const payload = await request(`/items/gas_daily?${params.toString()}`);
	return { items: mapSnapshots(payload), total: readMetaCount(payload) };
};

export const readBrandAreaSlugs = async (brandSlug: string): Promise<string[]> => {
	const params = new URLSearchParams({ limit: '-1', fields: 'area_slug' });
	params.set('filter[brand_slug][_eq]', brandSlug);
	params.set('filter[area_type][_eq]', 'city');
	const payload = await request(`/items/gas_daily?${params.toString()}`);
	return [
		...new Set(
			readDataItems(payload)
				.map((item) => readRecordString(item, 'area_slug'))
				.filter(Boolean),
		),
	];
};

/**
 * Возвращает одну агрегированную запись на город и сеть. В sitemap не нужны
 * fuel_prices: с получасовой историей их загрузка раздувает ответ на мегабайты.
 * Снимки трасс и отдельных АЗС отсекаются: URL цен строятся только по городам.
 */
export const readGasPriceSitemapEntries = async (since: string): Promise<GasPriceSitemapEntry[]> => {
	const params = new URLSearchParams({ limit: '-1' });
	params.append('aggregate[count]', 'id');
	params.append('aggregate[max]', 'snapshot_date');
	params.append('aggregate[max]', 'source_updated_at');
	params.append('groupBy[]', 'area_type');
	params.append('groupBy[]', 'area_slug');
	params.append('groupBy[]', 'brand_slug');
	params.set('filter[area_type][_eq]', 'city');
	params.set('filter[snapshot_date][_gte]', since);
	const payload = await request(
		`/items/gas_daily?${params.toString()}`,
		SITEMAP_REQUEST_TIMEOUT_MS,
	);
	return readDataItems(payload)
		.map(toGasPriceSitemapEntry)
		.filter((item): item is GasPriceSitemapEntry => item !== null);
};
