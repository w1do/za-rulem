import type { StationData } from '../../../lib/gasStations';
import { isStationData } from '../../../lib/gasStations';
import { toGasPriceSnapshot } from '../../gas-prices/api/dto';
import type { GeoPoint, RoadSegment, RoadSegmentPrices, SegmentBounds } from '../model/types';

const DEFAULT_CORRIDOR_KM = 5;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null;

const stringValue = (value: unknown): string => (typeof value === 'string' ? value : '');

const finiteNumber = (value: unknown): number | null => {
	const parsed = Number(value);
	return Number.isFinite(parsed) && value !== null && value !== '' ? parsed : null;
};

const toGeoPoint = (latitude: unknown, longitude: unknown): GeoPoint | null => {
	const lat = finiteNumber(latitude);
	const lon = finiteNumber(longitude);
	return lat === null || lon === null ? null : { lat, lon };
};

const toBounds = (value: Record<string, unknown>): SegmentBounds | null => {
	const minLat = finiteNumber(value.bounds_min_lat);
	const maxLat = finiteNumber(value.bounds_max_lat);
	const minLon = finiteNumber(value.bounds_min_lon);
	const maxLon = finiteNumber(value.bounds_max_lon);
	if (minLat === null || maxLat === null || minLon === null || maxLon === null) return null;
	return { minLat, maxLat, minLon, maxLon };
};

/** Полилиния хранится как [[lon, lat], ...] или [{ lat, lon }, ...]. */
const toGeometry = (value: unknown): [number, number][] | null => {
	if (!Array.isArray(value)) return null;

	const points = value.reduce<[number, number][]>((accumulator, point) => {
		if (Array.isArray(point) && point.length === 2) {
			const first = finiteNumber(point[0]);
			const second = finiteNumber(point[1]);
			if (first !== null && second !== null) accumulator.push([first, second]);
			return accumulator;
		}
		if (isRecord(point)) {
			const geoPoint = toGeoPoint(point.lat, point.lon ?? point.lng);
			if (geoPoint) accumulator.push([geoPoint.lon, geoPoint.lat]);
		}
		return accumulator;
	}, []);

	return points.length >= 2 ? points : null;
};

export const readDataItems = (payload: unknown): unknown[] =>
	isRecord(payload) && Array.isArray(payload.data) ? payload.data : [];

export const toRoadSegment = (value: unknown): RoadSegment | null => {
	if (!isRecord(value)) return null;

	const id = typeof value.id === 'string' || typeof value.id === 'number' ? value.id : '';
	const routeCode = stringValue(value.route_code);
	const slug = stringValue(value.slug);
	const name = stringValue(value.name);

	if (!slug || !name || !routeCode) return null;

	const center = isRecord(value.center)
		? (toGeoPoint(value.center.lat, value.center.lon ?? value.center.lng) ?? { lat: 0, lon: 0 })
		: { lat: 0, lon: 0 };

	const stations: StationData[] = []; // Deprecated JSON field, fetch from unified collection instead

	return {
		id,
		status: stringValue(value.status),
		sort: finiteNumber(value.sort),
		routeCode,
		slug,
		name,
		citySlug: stringValue(value.city_slug),
		center,
		start: toGeoPoint(value.start_lat, value.start_lon),
		end: toGeoPoint(value.end_lat, value.end_lon),
		bounds: toBounds(value),
		corridorKm: finiteNumber(value.corridor_km) ?? DEFAULT_CORRIDOR_KM,
		geometry: toGeometry(value.geometry),
		stations,
		seoTitle: stringValue(value.seo_title),
		seoDescription: stringValue(value.seo_description),
		content: stringValue(value.content),
	};
};

/**
 * Снимки цен участков лежат в единой коллекции `gas_daily` (`area_type = road`),
 * поэтому слаг участка приходит в `area_slug`.
 */
export const toRoadSegmentPrices = (value: unknown): RoadSegmentPrices | null => {
	if (!isRecord(value)) return null;

	const segmentSlug = stringValue(value.area_slug) || stringValue(value.segment_slug);
	if (!segmentSlug) return null;

	const snapshot = toGasPriceSnapshot({ ...value, city_slug: segmentSlug });
	if (!snapshot) return null;

	return { ...snapshot, segmentSlug };
};
