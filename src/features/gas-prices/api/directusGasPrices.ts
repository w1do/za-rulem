import type { GasBrand, GasPriceSitemapEntry, GasPriceSnapshot } from '../model/types';
import {
	readDataItems,
	readMetaCount,
	readRecordString,
	toGasBrand,
	toGasPriceSitemapEntry,
	toGasPriceSnapshot,
} from './dto';
import { getOrFetchSwr, safeFetchWithTimeout } from '../../../shared/lib/cache/fileSwrCache';

const DIRECTUS_URL = (
	process.env.DIRECTUS_URL ||
	process.env.PUBLIC_DIRECTUS_URL ||
	import.meta.env.PUBLIC_DIRECTUS_URL ||
	'https://api.za-rulem.org'
).replace(/\/$/, '');
const DIRECTUS_TOKEN = process.env.DIRECTUS_GAS_PRICES_TOKEN || '';

const REQUEST_TIMEOUT_MS = 3_000;
const CATALOG_REQUEST_TIMEOUT_MS = 4_000;
const SITEMAP_REQUEST_TIMEOUT_MS = 6_000;
const CACHE_TTL_MS = Number(process.env.GAS_PRICE_CACHE_TTL_MS) || 5 * 60 * 1000;

const SNAPSHOT_FIELDS =
	'id,area_type,area_slug,brand_slug,snapshot_date,station_count,source_updated_at,fuel_prices,date_created';

const request = async (path: string, timeoutMs = REQUEST_TIMEOUT_MS): Promise<unknown> => {
	const headers = new Headers({ Accept: 'application/json' });
	if (DIRECTUS_TOKEN) headers.set('Authorization', `Bearer ${DIRECTUS_TOKEN}`);
	const response = await safeFetchWithTimeout(`${DIRECTUS_URL}${path}`, { headers }, timeoutMs);
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
	return getOrFetchSwr<GasPriceSnapshot[]>({
		key: `gas-prices:city-snapshots:${areaSlug}:${limit}`,
		ttlMs: CACHE_TTL_MS,
		staleTtlMs: 7 * 24 * 60 * 60 * 1000,
		fallback: [],
		fetcher: async () => {
			const params = new URLSearchParams({
				limit: String(limit),
				fields: SNAPSHOT_FIELDS,
				sort: '-snapshot_date',
			});
			params.set('filter[area_slug][_eq]', areaSlug);
			params.set('filter[area_type][_eq]', 'city');
			return mapSnapshots(await request(`/items/gas_daily?${params.toString()}`));
		},
	});
};

/**
 * Один запрос для каталога городов вместо последовательного чтения истории
 * каждого города. Ограничение по дате сохраняет ответ компактным, но оставляет
 * предыдущий снимок, необходимый для расчёта динамики.
 */
export const readRecentCitySnapshots = async (since: string): Promise<GasPriceSnapshot[]> => {
	// Округляем ключ до часа, чтобы эффективно переиспользовать SWR-кеш
	const timeBucket = since.slice(0, 13);
	return getOrFetchSwr<GasPriceSnapshot[]>({
		key: `gas-prices:recent-city-snapshots:${timeBucket}`,
		ttlMs: CACHE_TTL_MS,
		staleTtlMs: 7 * 24 * 60 * 60 * 1000,
		fallback: [],
		fetcher: async () => {
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
		},
	});
};

export const readBrandHistory = async (
	areaSlug: string,
	brandSlug: string,
	page: number,
	perPage: number,
): Promise<{ items: GasPriceSnapshot[]; total: number }> => {
	return getOrFetchSwr<{ items: GasPriceSnapshot[]; total: number }>({
		key: `gas-prices:brand-history:${areaSlug}:${brandSlug}:${page}:${perPage}`,
		ttlMs: CACHE_TTL_MS,
		staleTtlMs: 7 * 24 * 60 * 60 * 1000,
		fallback: { items: [], total: 0 },
		fetcher: async () => {
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
		},
	});
};

export const readBrandAreaSlugs = async (brandSlug: string): Promise<string[]> => {
	return getOrFetchSwr<string[]>({
		key: `gas-prices:brand-areas:${brandSlug}`,
		ttlMs: CACHE_TTL_MS * 2,
		staleTtlMs: 7 * 24 * 60 * 60 * 1000,
		fallback: [],
		fetcher: async () => {
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
		},
	});
};

/**
 * Возвращает одну агрегированную запись на город и сеть. В sitemap не нужны
 * fuel_prices: с получасовой историей их загрузка раздувает ответ на мегабайты.
 * Снимки трасс и отдельных АЗС отсекаются: URL цен строятся только по городам.
 */
export const readGasPriceSitemapEntries = async (since: string): Promise<GasPriceSitemapEntry[]> => {
	const timeBucket = since.slice(0, 13);
	return getOrFetchSwr<GasPriceSitemapEntry[]>({
		key: `gas-prices:sitemap-entries:${timeBucket}`,
		ttlMs: CACHE_TTL_MS * 3,
		staleTtlMs: 7 * 24 * 60 * 60 * 1000,
		fallback: [],
		fetcher: async () => {
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
		},
	});
};
