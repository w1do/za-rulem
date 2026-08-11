import type { StationData } from '../../../lib/gasStations';

export type LngLat = [longitude: number, latitude: number];

export type RoadGeometry = {
	type: 'MultiLineString';
	coordinates: LngLat[][];
};

export type RoadStationsResponse = {
	stations: StationData[];
	fetchedAt: string;
	isPartial: boolean;
};
