import { readStations } from '../../gas-stations';
import type { StationData } from '../../../lib/gasStations';
import { filterStationsByRoad, getRoadQueryBounds } from '../model/geometry';
import { getRoadGeometry } from '../model/geometryRegistry';
import type { RoadStationsResponse } from '../model/types';

const FRESH_CACHE_TTL_MS = 5 * 60 * 1000;
const STALE_CACHE_TTL_MS = 30 * 60 * 1000;

type CacheEntry = {
	response: RoadStationsResponse;
	storedAt: number;
};

type RoadStationsCache = {
	entries: Map<string, CacheEntry>;
	inFlight: Map<string, Promise<RoadStationsResponse>>;
};

const CACHE_KEY = '__zaRulemRoadStationsCache';
const globalScope = globalThis as typeof globalThis & { [CACHE_KEY]?: RoadStationsCache };
const cache = (globalScope[CACHE_KEY] ??= {
	entries: new Map(),
	inFlight: new Map(),
});

export class RoadNotFoundError extends Error {}
export class RoadStationsUnavailableError extends Error {}

const deduplicateStations = (stations: StationData[]): StationData[] => [
	...new Map(stations.map((station) => [station.station.id, station])).values(),
];

const requestRoadStations = async (slug: string): Promise<RoadStationsResponse> => {
	const geometry = getRoadGeometry(slug);
	if (!geometry) throw new RoadNotFoundError(`Unknown road: ${slug}`);

	const queryBounds = getRoadQueryBounds(geometry);
	// Единственный источник — Directus: реестр `stations` и цены `gas_daily`.
	const allResults = await Promise.all(
		queryBounds.map(async (bounds) => {
			try {
				return { stations: await readStations(bounds), isSuccessful: true };
			} catch (error) {
				console.error('[road-gas-stations] Directus stations request failed:', error);
				return { stations: [] as StationData[], isSuccessful: false };
			}
		}),
	);

	const successfulResults = allResults.filter((result) => result.isSuccessful);
	if (successfulResults.length === 0) {
		throw new RoadStationsUnavailableError(`Data is unavailable for road ${slug}`);
	}

	const stations = deduplicateStations(successfulResults.flatMap((result) => result.stations));

	return {
		stations: filterStationsByRoad(stations, geometry),
		fetchedAt: new Date().toISOString(),
		isPartial: successfulResults.length !== allResults.length,
	};
};

export const getRoadGasStations = async (slug: string): Promise<RoadStationsResponse> => {
	const now = Date.now();
	const cached = cache.entries.get(slug);
	if (cached && now - cached.storedAt < FRESH_CACHE_TTL_MS) return cached.response;

	const runningRequest = cache.inFlight.get(slug);
	if (runningRequest) return runningRequest;

	const request = requestRoadStations(slug)
		.then((response) => {
			cache.entries.set(slug, { response, storedAt: Date.now() });
			return response;
		})
		.catch((error: unknown) => {
			if (
				cached &&
				now - cached.storedAt < STALE_CACHE_TTL_MS &&
				error instanceof RoadStationsUnavailableError
			) {
				return { ...cached.response, isPartial: true };
			}
			throw error;
		})
		.finally(() => cache.inFlight.delete(slug));

	cache.inFlight.set(slug, request);
	return request;
};
