import type { MapBounds, StationData } from '../../../lib/gasStations';
import {
	isDirectusStation,
	readDataItems,
	toStationData,
	toStationDataFromSnapshot,
	toStationPricesSnapshot,
	type StationPricesSnapshot,
} from './dto';
import { getOrFetchSwr, safeFetchWithTimeout } from '../../../shared/lib/cache/fileSwrCache';

const DIRECTUS_URL = (
	process.env.DIRECTUS_URL ||
	process.env.PUBLIC_DIRECTUS_URL ||
	import.meta.env.PUBLIC_DIRECTUS_URL ||
	'https://api.za-rulem.org'
).replace(/\/$/, '');

const DIRECTUS_TOKEN = process.env.DIRECTUS_GAS_PRICES_TOKEN || '';
const REQUEST_TIMEOUT_MS = 3_500;
/** Directus фильтрует по `_in` через query string, поэтому идентификаторы отправляются пачками. */
const PRICE_ID_CHUNK_SIZE = 100;
/** Реестр отвечает тем дольше, чем больше id в фильтре, поэтому пачки мельче и идут параллельно. */
const STATION_ID_CHUNK_SIZE = 50;
/** Больше двух одновременных запросов Directus обрывает по таймауту соединения. */
const STATION_REQUEST_CONCURRENCY = 2;
/** Страница цен и чат-лендинг одного города не должны дублировать выгрузку. */
const CITY_CACHE_TTL_MS = Number(process.env.GAS_PRICE_CACHE_TTL_MS) || 5 * 60 * 1000;

const STATION_FIELDS =
	'id,status,name,brand,address,lat,lng,fuel_assortment,fuel_statuses,prices,last_transaction_at,closed,queue_level';
/** Для городского режима цены берутся из `gas_daily`, поэтому `prices` реестра не запрашиваются. */
const STATION_CARD_FIELDS =
	'id,status,name,brand,address,lat,lng,fuel_assortment,fuel_statuses,last_transaction_at,closed,queue_level';
const STATION_PRICE_FIELDS =
	'station,area_slug,area_parent_slug,brand_slug,snapshot_date,source_updated_at,fuel_prices';

/**
 * Directus рвёт HTTP/2-соединение при массовой генерации страниц, поэтому сетевой сбой
 * повторяется один раз: одиночный обрыв не должен терять станции целого города или участка.
 */
const fetchWithRetry = async (url: string, headers: Headers): Promise<Response> => {
	let lastError: unknown;

	for (let attempt = 0; attempt < 2; attempt += 1) {
		try {
			return await safeFetchWithTimeout(url, { headers }, REQUEST_TIMEOUT_MS);
		} catch (error) {
			lastError = error;
		}
	}

	throw lastError;
};

const request = async (path: string): Promise<unknown> => {
	const headers = new Headers({ Accept: 'application/json' });
	if (DIRECTUS_TOKEN) headers.set('Authorization', `Bearer ${DIRECTUS_TOKEN}`);

	const response = await fetchWithRetry(`${DIRECTUS_URL}${path}`, headers);

	if (!response.ok) {
		if (response.status === 403 || response.status === 404) {
			console.warn(`[gas-stations] Directus access issue (${response.status}) for: ${path}`);
			return { data: [] };
		}
		throw new Error(`Directus stations request failed: ${response.status}`);
	}

	return response.status === 204 ? null : response.json();
};

const chunk = <T>(items: T[], size: number): T[][] => {
	const chunks: T[][] = [];
	for (let index = 0; index < items.length; index += size) {
		chunks.push(items.slice(index, index + size));
	}
	return chunks;
};

/**
 * Последний снимок цен `gas_daily` (`area_type=point`) по каждой станции.
 * Сортировка по убыванию даты позволяет взять первую встреченную запись станции.
 */
export const readLatestStationPrices = async (
	stationIds: string[],
): Promise<Map<string, StationPricesSnapshot>> => {
	const latest = new Map<string, StationPricesSnapshot>();
	if (stationIds.length === 0) return latest;

	for (const ids of chunk(stationIds, PRICE_ID_CHUNK_SIZE)) {
		const params = new URLSearchParams({
			limit: '-1',
			fields: STATION_PRICE_FIELDS,
			sort: '-snapshot_date',
		});
		params.set('filter[area_type][_eq]', 'point');
		params.set('filter[station][_in]', ids.join(','));

		const payload = await request(`/items/gas_daily?${params.toString()}`);
		readDataItems(payload).forEach((item) => {
			const snapshot = toStationPricesSnapshot(item);
			if (!snapshot) return;
			const stored = latest.get(snapshot.stationId);
			if (!stored || stored.snapshotDate < snapshot.snapshotDate) {
				latest.set(snapshot.stationId, snapshot);
			}
		});
	}

	return latest;
};

/**
 * Свежие снимки `gas_daily` (`area_type=point`) по всем АЗС города.
 * `area_parent_slug` заполняет парсер, поэтому город определяется без выборки по координатам.
 */
export const readCityStationPriceHistory = async (
	citySlug: string,
	since?: string,
): Promise<StationPricesSnapshot[]> => {
	const timeBucket = since ? since.slice(0, 13) : 'all';
	return getOrFetchSwr<StationPricesSnapshot[]>({
		key: `gas-stations:city-price-history:${citySlug}:${timeBucket}`,
		ttlMs: CITY_CACHE_TTL_MS,
		staleTtlMs: 7 * 24 * 60 * 60 * 1000,
		fallback: [],
		fetcher: async () => {
			const params = new URLSearchParams({
				limit: '-1',
				fields: STATION_PRICE_FIELDS,
				sort: '-snapshot_date',
			});
			params.set('filter[area_type][_eq]', 'point');
			params.set('filter[area_parent_slug][_eq]', citySlug);
			if (since) params.set('filter[snapshot_date][_gte]', since);

			const payload = await request(`/items/gas_daily?${params.toString()}`);
			return readDataItems(payload)
				.map(toStationPricesSnapshot)
				.filter((snapshot): snapshot is StationPricesSnapshot => snapshot !== null);
		},
	});
};

const readCityPriceSnapshots = async (
	citySlug: string,
): Promise<Map<string, StationPricesSnapshot>> => {
	const snapshots = await readCityStationPriceHistory(citySlug);
	const latest = new Map<string, StationPricesSnapshot>();
	snapshots.forEach((snapshot) => {
		const stored = latest.get(snapshot.stationId);
		if (!stored || stored.snapshotDate < snapshot.snapshotDate) {
			latest.set(snapshot.stationId, snapshot);
		}
	});

	return latest;
};

/**
 * Карточки АЗС единого реестра по идентификаторам из снимков цен.
 * Неудавшаяся пачка не отменяет остальные: цены показываются и без карточки.
 */
export const readStationCardsByIds = async (
	stationIds: string[],
): Promise<Map<string, StationData>> => {
	const stations = new Map<string, StationData>();
	if (stationIds.length === 0) return stations;

	const batches = chunk(stationIds, STATION_ID_CHUNK_SIZE);
	const readBatch = async (ids: string[]): Promise<unknown[]> => {
		const params = new URLSearchParams({ limit: '-1', fields: STATION_CARD_FIELDS });
		params.set('filter[id][_in]', ids.join(','));

		try {
			return readDataItems(await request(`/items/stations?${params.toString()}`));
		} catch (error) {
			console.warn('[gas-stations] Failed to read stations batch:', error);
			return [];
		}
	};

	// Directus сбрасывает соединения при большом числе одновременных запросов.
	for (const parallel of chunk(batches, STATION_REQUEST_CONCURRENCY)) {
		const results = await Promise.all(parallel.map(readBatch));
		results
			.flat()
			.filter(isDirectusStation)
			.map(toStationData)
			.forEach((station) => stations.set(station.station.id, station));
	}

	return stations;
};

/** Цены и время обновления станции берутся из свежего снимка `gas_daily`, если он есть. */
const withLatestPrices = (
	station: StationData,
	snapshot: StationPricesSnapshot | undefined,
): StationData => {
	if (!snapshot) return station;
	const lastTransactionAt =
		station.station.last_transaction_at > snapshot.snapshotDate
			? station.station.last_transaction_at
			: snapshot.snapshotDate;

	return {
		...station,
		station: { ...station.station, last_transaction_at: lastTransactionAt },
		prices: snapshot.prices,
	};
};

const readCityStationsFromDirectus = async (citySlug: string): Promise<StationData[]> => {
	const snapshots = await readCityPriceSnapshots(citySlug);
	if (snapshots.size === 0) return [];

	const stations = await readStationCardsByIds([...snapshots.keys()]);

	return [...snapshots.values()].map((snapshot) => {
		const station = stations.get(snapshot.stationId);
		return station ? withLatestPrices(station, snapshot) : toStationDataFromSnapshot(snapshot);
	});
};

/**
 * Станции города с актуальными ценами.
 * Источник состава — `gas_daily` (`area_type=point`, `area_parent_slug=<город>`):
 * только там есть свежие цены и надёжная привязка АЗС к городу.
 * Карточки (название, адрес, координаты) добираются из реестра `stations` по `id`.
 */
export const readCityStations = async (citySlug: string): Promise<StationData[]> => {
	if (!citySlug) return [];

	return getOrFetchSwr<StationData[]>({
		key: `gas-stations:city:${citySlug}`,
		ttlMs: CITY_CACHE_TTL_MS,
		staleTtlMs: 7 * 24 * 60 * 60 * 1000,
		fallback: [],
		fetcher: () => readCityStationsFromDirectus(citySlug),
	});
};

/**
 * Читает станции единого реестра Directus `stations` в границах карты
 * и дополняет их последними ценами из `gas_daily`. Используется там, где город неизвестен
 * (участки трасс). Для городских страниц предпочтителен `readCityStations`.
 */
export const readStations = async (bounds: MapBounds): Promise<StationData[]> => {
	const boundsKey = `${bounds.minLat.toFixed(2)}:${bounds.maxLat.toFixed(2)}:${bounds.minLon.toFixed(2)}:${bounds.maxLon.toFixed(2)}`;

	return getOrFetchSwr<StationData[]>({
		key: `gas-stations:bounds:${boundsKey}`,
		ttlMs: CITY_CACHE_TTL_MS,
		staleTtlMs: 7 * 24 * 60 * 60 * 1000,
		fallback: [],
		fetcher: async () => {
			const params = new URLSearchParams({
				limit: '-1',
				fields: STATION_FIELDS,
				'filter[lat][_between]': `${bounds.minLat},${bounds.maxLat}`,
				'filter[lng][_between]': `${bounds.minLon},${bounds.maxLon}`,
			});

			const payload = await request(`/items/stations?${params.toString()}`);
			const stations = readDataItems(payload).filter(isDirectusStation).map(toStationData);
			if (stations.length === 0) return stations;

			try {
				const prices = await readLatestStationPrices(stations.map((item) => item.station.id));
				return stations.map((station) => withLatestPrices(station, prices.get(station.station.id)));
			} catch (error) {
				// Цены снимков — дополнение к реестру: без них карта показывает данные самой станции.
				console.warn('[gas-stations] Failed to read gas_daily point prices:', error);
				return stations;
			}
		},
	});
};
