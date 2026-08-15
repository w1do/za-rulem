import type { MapBounds } from '../../../lib/gasStations';
import type { GeoPoint, RoadSegment } from '../model/types';

const KM_PER_LATITUDE_DEGREE = 111.32;
const MINIMUM_PADDING_KM = 3;

type LngLat = [number, number];

export interface SegmentMapView {
	bounds: MapBounds;
}

interface BuildSegmentMapViewOptions {
	segment: RoadSegment;
	/** Полилинии всей трассы в порядке [longitude, latitude]. */
	roadLines?: LngLat[][];
	/** Центры соседних участков — используются, если у участка нет start/end. */
	previousCenter?: GeoPoint | null;
	nextCenter?: GeoPoint | null;
}

const midpoint = (first: GeoPoint, second: GeoPoint): GeoPoint => ({
	lat: (first.lat + second.lat) / 2,
	lon: (first.lon + second.lon) / 2,
});

const squareDistance = (point: LngLat, target: GeoPoint): number => {
	const deltaLon = (point[0] - target.lon) * Math.cos((target.lat * Math.PI) / 180);
	const deltaLat = point[1] - target.lat;
	return deltaLon * deltaLon + deltaLat * deltaLat;
};

const nearestIndex = (line: LngLat[], target: GeoPoint): number => {
	let bestIndex = 0;
	let bestDistance = Number.POSITIVE_INFINITY;
	line.forEach((point, index) => {
		const distance = squareDistance(point, target);
		if (distance < bestDistance) {
			bestDistance = distance;
			bestIndex = index;
		}
	});
	return bestIndex;
};

/** Выбирает ту полилинию трассы, которая ближе всего к центру участка. */
const pickClosestLine = (lines: LngLat[][], center: GeoPoint): LngLat[] | null => {
	let bestLine: LngLat[] | null = null;
	let bestDistance = Number.POSITIVE_INFINITY;
	for (const line of lines) {
		if (line.length < 2) continue;
		const distance = squareDistance(line[nearestIndex(line, center)], center);
		if (distance < bestDistance) {
			bestDistance = distance;
			bestLine = line;
		}
	}
	return bestLine;
};

const resolveEdges = ({
	segment,
	previousCenter,
	nextCenter,
}: BuildSegmentMapViewOptions): { start: GeoPoint; end: GeoPoint } => {
	const start =
		segment.start ?? (previousCenter ? midpoint(previousCenter, segment.center) : segment.center);
	const end = segment.end ?? (nextCenter ? midpoint(segment.center, nextCenter) : segment.center);
	return { start, end };
};

const cutSegmentLine = (
	line: LngLat[],
	start: GeoPoint,
	end: GeoPoint,
): LngLat[] | null => {
	const firstIndex = nearestIndex(line, start);
	const lastIndex = nearestIndex(line, end);
	const from = Math.min(firstIndex, lastIndex);
	const to = Math.max(firstIndex, lastIndex);
	const slice = line.slice(from, to + 1);
	return slice.length >= 2 ? slice : null;
};

const padBounds = (bounds: MapBounds, corridorKm: number): MapBounds => {
	const paddingKm = Math.max(MINIMUM_PADDING_KM, corridorKm);
	const middleLatitude = (bounds.minLat + bounds.maxLat) / 2;
	const latitudePadding = paddingKm / KM_PER_LATITUDE_DEGREE;
	const longitudePadding =
		paddingKm /
		(KM_PER_LATITUDE_DEGREE * Math.max(0.2, Math.cos((middleLatitude * Math.PI) / 180)));

	return {
		minLat: bounds.minLat - latitudePadding,
		maxLat: bounds.maxLat + latitudePadding,
		minLon: bounds.minLon - longitudePadding,
		maxLon: bounds.maxLon + longitudePadding,
	};
};

const boundsOfPoints = (points: LngLat[]): MapBounds => ({
	minLat: Math.min(...points.map((point) => point[1])),
	maxLat: Math.max(...points.map((point) => point[1])),
	minLon: Math.min(...points.map((point) => point[0])),
	maxLon: Math.max(...points.map((point) => point[0])),
});

/**
 * Строит вид карты участка: рамку, покрывающую отрезок трассы вместе с АЗС участка.
 * Геометрия отрезка нужна только для расчёта рамки: своя линия на карте не рисуется.
 */
export const buildSegmentMapView = (options: BuildSegmentMapViewOptions): SegmentMapView => {
	const { segment, roadLines } = options;
	const { start, end } = resolveEdges(options);

	const roadLine = roadLines?.length ? pickClosestLine(roadLines, segment.center) : null;
	const segmentLine =
		segment.geometry ??
		(roadLine ? cutSegmentLine(roadLine, start, end) : null) ??
		(start.lat !== end.lat || start.lon !== end.lon
			? ([
					[start.lon, start.lat],
					[end.lon, end.lat],
				] as LngLat[])
			: null);

	const stationPoints = segment.stations.reduce<LngLat[]>((accumulator, { station }) => {
		const latitude = Number(station.lat);
		const longitude = Number(station.lng);
		if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
			accumulator.push([longitude, latitude]);
		}
		return accumulator;
	}, []);

	const points = [...(segmentLine ?? []), ...stationPoints];
	const bounds =
		segment.bounds ??
		(points.length > 0
			? padBounds(boundsOfPoints(points), segment.corridorKm)
			: padBounds(
					{
						minLat: segment.center.lat,
						maxLat: segment.center.lat,
						minLon: segment.center.lon,
						maxLon: segment.center.lon,
					},
					Math.max(segment.corridorKm, 12),
				));

	return { bounds };
};
