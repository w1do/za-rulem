import type { ChatCity } from '../../../lib/cities';

export const RANKING_FUEL_TYPES = ['AI_92', 'AI_95', 'AI_100', 'DT'] as const;

export type RankingFuelType = (typeof RANKING_FUEL_TYPES)[number];
export type RankingKind = 'cheapest' | 'expensive';
export type RankingPriceTrend = 'up' | 'down' | 'stable' | 'unknown';

export interface StationFuelTrend {
	fuelType: RankingFuelType;
	label: string;
	currentPrice: number | null;
	previousPrice: number | null;
	delta: number | null;
	trend: RankingPriceTrend;
	updatedAt: string | null;
}

export interface RankedGasStation {
	id: string;
	rank: number;
	name: string;
	brand: string;
	address: string;
	updatedAt: string;
	prices: StationFuelTrend[];
}

export interface GasStationRankingSection {
	fuelType: RankingFuelType;
	label: string;
	stations: RankedGasStation[];
}

export interface CityStationRankingData {
	citySlug: string;
	kind: RankingKind;
	sections: GasStationRankingSection[];
	totalStations: number;
	updatedAt: string | null;
	isIndexable: boolean;
}

export interface AzsCityCatalogItem {
	city: Pick<ChatCity, 'slug' | 'name' | 'region' | 'hint' | 'isFeatured'>;
	updatedAt: string;
}
