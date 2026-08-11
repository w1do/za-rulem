import type { MapBounds, StationData } from '../../../lib/gasStations';
import type { LngLat, RoadGeometry } from './types';

export const ROAD_STATION_CORRIDOR_KM = 15;

const EARTH_RADIUS_KM = 6371.0088;
const QUERY_GRID_SIZE_DEGREES = 2;
const KM_PER_LATITUDE_DEGREE = 111.32;

const isLngLat = (value: unknown): value is LngLat =>
	Array.isArray(value) &&
	value.length === 2 &&
	typeof value[0] === 'number' &&
	Number.isFinite(value[0]) &&
	value[0] >= -180 &&
	value[0] <= 180 &&
	typeof value[1] === 'number' &&
	Number.isFinite(value[1]) &&
	value[1] >= -90 &&
	value[1] <= 90;

export const parseRoadGeometry = (value: unknown): RoadGeometry => {
	if (
		typeof value !== 'object' ||
		value === null ||
		!('type' in value) ||
		value.type !== 'MultiLineString' ||
		!('coordinates' in value) ||
		!Array.isArray(value.coordinates)
	) {
		throw new Error('Invalid road geometry');
	}

	const coordinates = value.coordinates.filter(
		(line): line is LngLat[] => Array.isArray(line) && line.length >= 2 && line.every(isLngLat),
	);
	if (coordinates.length === 0) throw new Error('Road geometry has no valid lines');

	return { type: 'MultiLineString', coordinates };
};

export const getRoadBounds = (geometry: RoadGeometry): MapBounds => {
	let minLat = Number.POSITIVE_INFINITY;
	let maxLat = Number.NEGATIVE_INFINITY;
	let minLon = Number.POSITIVE_INFINITY;
	let maxLon = Number.NEGATIVE_INFINITY;

	for (const line of geometry.coordinates) {
		for (const [longitude, latitude] of line) {
			minLat = Math.min(minLat, latitude);
			maxLat = Math.max(maxLat, latitude);
			minLon = Math.min(minLon, longitude);
			maxLon = Math.max(maxLon, longitude);
		}
	}

	return { minLat, maxLat, minLon, maxLon };
};

const gridKey = ([longitude, latitude]: LngLat): string =>
	`${Math.floor(longitude / QUERY_GRID_SIZE_DEGREES)}:${Math.floor(latitude / QUERY_GRID_SIZE_DEGREES)}`;

const interpolateSegment = (start: LngLat, end: LngLat): LngLat[] => {
	const span = Math.max(Math.abs(end[0] - start[0]), Math.abs(end[1] - start[1]));
	const steps = Math.max(1, Math.ceil(span / (QUERY_GRID_SIZE_DEGREES / 2)));
	return Array.from({ length: steps + 1 }, (_, index) => {
		const ratio = index / steps;
		return [
			start[0] + (end[0] - start[0]) * ratio,
			start[1] + (end[1] - start[1]) * ratio,
		];
	});
};

/** Строит небольшие запросные области вдоль трассы, не охватывая весь её общий bbox. */
export const getRoadQueryBounds = (
	geometry: RoadGeometry,
	corridorKm = ROAD_STATION_CORRIDOR_KM,
): MapBounds[] => {
	const pointsByGrid = new Map<string, LngLat[]>();

	for (const line of geometry.coordinates) {
		for (let index = 1; index < line.length; index += 1) {
			for (const point of interpolateSegment(line[index - 1], line[index])) {
				const key = gridKey(point);
				const points = pointsByGrid.get(key) ?? [];
				points.push(point);
				pointsByGrid.set(key, points);
			}
		}
	}

	return [...pointsByGrid.values()].map((points) => {
		const latitudes = points.map((point) => point[1]);
		const longitudes = points.map((point) => point[0]);
		const middleLatitude = (Math.min(...latitudes) + Math.max(...latitudes)) / 2;
		const latitudeBuffer = corridorKm / KM_PER_LATITUDE_DEGREE;
		const longitudeBuffer =
			corridorKm / (KM_PER_LATITUDE_DEGREE * Math.max(0.2, Math.cos((middleLatitude * Math.PI) / 180)));

		return {
			minLat: Math.min(...latitudes) - latitudeBuffer,
			maxLat: Math.max(...latitudes) + latitudeBuffer,
			minLon: Math.min(...longitudes) - longitudeBuffer,
			maxLon: Math.max(...longitudes) + longitudeBuffer,
		};
	});
};

const squareDistanceToSegmentKm = (point: LngLat, start: LngLat, end: LngLat): number => {
	const referenceLatitude = (point[1] * Math.PI) / 180;
	const project = ([longitude, latitude]: LngLat): [number, number] => [
		EARTH_RADIUS_KM * ((longitude * Math.PI) / 180) * Math.cos(referenceLatitude),
		EARTH_RADIUS_KM * ((latitude * Math.PI) / 180),
	];
	const projectedPoint = project(point);
	const projectedStart = project(start);
	const projectedEnd = project(end);
	const segmentX = projectedEnd[0] - projectedStart[0];
	const segmentY = projectedEnd[1] - projectedStart[1];
	const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;
	const ratio =
		segmentLengthSquared === 0
			? 0
			: Math.max(
					0,
					Math.min(
						1,
						((projectedPoint[0] - projectedStart[0]) * segmentX +
							(projectedPoint[1] - projectedStart[1]) * segmentY) /
							segmentLengthSquared,
					),
				);
	const closestX = projectedStart[0] + ratio * segmentX;
	const closestY = projectedStart[1] + ratio * segmentY;
	const distanceX = projectedPoint[0] - closestX;
	const distanceY = projectedPoint[1] - closestY;
	return distanceX * distanceX + distanceY * distanceY;
};

export const isPointWithinRoadCorridor = (
	point: LngLat,
	geometry: RoadGeometry,
	corridorKm = ROAD_STATION_CORRIDOR_KM,
): boolean => {
	const maximumSquareDistance = corridorKm * corridorKm;
	for (const line of geometry.coordinates) {
		for (let index = 1; index < line.length; index += 1) {
			if (squareDistanceToSegmentKm(point, line[index - 1], line[index]) <= maximumSquareDistance) {
				return true;
			}
		}
	}
	return false;
};

export const filterStationsByRoad = (
	stations: StationData[],
	geometry: RoadGeometry,
): StationData[] =>
	stations.filter(({ station }) =>
		isPointWithinRoadCorridor([Number(station.lng), Number(station.lat)], geometry),
	);
