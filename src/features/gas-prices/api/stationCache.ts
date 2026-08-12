import { fetchGasStationsResult, type MapBounds, type StationsFetchResult } from '../../../lib/gasStations';

interface CacheEntry {
	value: StationsFetchResult;
	fetchedAt: number;
}

const cache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<StationsFetchResult>>();
const freshTtlMs = Number(process.env.GAS_PRICE_CACHE_TTL_MS) || 5 * 60 * 1000;
const staleTtlMs = Number(process.env.GAS_PRICE_STALE_TTL_MS) || 30 * 60 * 1000;

const keyForBounds = (bounds: MapBounds): string =>
	`${bounds.minLat}:${bounds.maxLat}:${bounds.minLon}:${bounds.maxLon}`;

export const fetchCachedGasStations = async (bounds: MapBounds): Promise<StationsFetchResult> => {
	const key = keyForBounds(bounds);
	const now = Date.now();
	const cached = cache.get(key);
	if (cached && now - cached.fetchedAt <= freshTtlMs) return cached.value;
	const pending = inFlight.get(key);
	if (pending) return pending;

	const request = fetchGasStationsResult(bounds)
		.then((result) => {
			if (result.isSuccessful) {
				cache.set(key, { value: result, fetchedAt: Date.now() });
				return result;
			}
			if (cached && now - cached.fetchedAt <= staleTtlMs) {
				return { stations: cached.value.stations, isSuccessful: false };
			}
			return result;
		})
		.finally(() => inFlight.delete(key));
	inFlight.set(key, request);
	return request;
};
