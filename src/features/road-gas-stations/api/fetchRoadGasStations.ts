import {
	fetchGasStationsResult,
	isStationDataFresh,
	type MapBounds,
	type StationData,
} from '../../../lib/gasStations';
import { filterStationsByRoad, getRoadQueryBounds } from '../model/geometry';
import { getRoadGeometry } from '../model/geometryRegistry';
import type { RoadStationsResponse } from '../model/types';

const FRESH_CACHE_TTL_MS = 5 * 60 * 1000;
const STALE_CACHE_TTL_MS = 30 * 60 * 1000;
const REQUEST_CONCURRENCY = 4;

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

const fetchInBatches = async (bounds: MapBounds[]) => {
	const results = [];
	for (let index = 0; index < bounds.length; index += REQUEST_CONCURRENCY) {
		const batch = bounds.slice(index, index + REQUEST_CONCURRENCY);
		results.push(...(await Promise.all(batch.map(fetchGasStationsResult))));
	}
	return results;
};

const deduplicateStations = (stations: StationData[]): StationData[] => [
	...new Map(stations.map((station) => [station.station.id, station])).values(),
];

const requestRoadStations = async (slug: string): Promise<RoadStationsResponse> => {
	const geometry = getRoadGeometry(slug);
	if (!geometry) throw new RoadNotFoundError(`Unknown road: ${slug}`);

	const results = await fetchInBatches(getRoadQueryBounds(geometry));
	const successfulResults = results.filter((result) => result.isSuccessful);
	if (successfulResults.length === 0) {
		throw new RoadStationsUnavailableError(`2GIS is unavailable for road ${slug}`);
	}

	const stations = deduplicateStations(successfulResults.flatMap((result) => result.stations)).filter(
		(station) => isStationDataFresh(station),
	);

	return {
		stations: filterStationsByRoad(stations, geometry),
		fetchedAt: new Date().toISOString(),
		isPartial: successfulResults.length !== results.length,
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
