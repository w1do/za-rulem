import type { StationData } from '../../../lib/gasStations';
import type { GasPriceSnapshot } from '../../gas-prices/model/types';

export interface GeoPoint {
	lat: number;
	lon: number;
}

export interface SegmentBounds {
	minLat: number;
	maxLat: number;
	minLon: number;
	maxLon: number;
}

export interface RoadSegment {
	id: string | number;
	status: string;
	sort: number | null;
	routeCode: string;
	slug: string;
	name: string;
	citySlug: string;
	center: GeoPoint;
	/** Начало участка, если задано в Directus. */
	start: GeoPoint | null;
	/** Конец участка, если задано в Directus. */
	end: GeoPoint | null;
	/** Готовая рамка участка из Directus (используется вместо расчётной). */
	bounds: SegmentBounds | null;
	corridorKm: number;
	/** Упрощённая полилиния участка в порядке [longitude, latitude]. */
	geometry: [number, number][] | null;
	stations: StationData[];
	seoTitle: string;
	seoDescription: string;
	content: string;
}

export interface RoadSegmentPrices extends GasPriceSnapshot {
	segmentSlug: string;
}
