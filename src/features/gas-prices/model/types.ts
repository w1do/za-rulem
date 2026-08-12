import type { StationData } from '../../../lib/gasStations.ts';

export const PRIMARY_FUEL_TYPES = ['AI_92', 'AI_95', 'DT'] as const;

export type PriceTrend = 'up' | 'down' | 'stable' | 'unknown';

export interface GasBrand {
	slug: string;
	name: string;
	aliases: string[];
	isIndexable: boolean;
	verificationStatus: 'verified' | 'unverified';
}

export interface FuelPriceSummary {
	fuelType: string;
	average: number;
	min: number;
	max: number;
	sampleCount: number;
	updatedAt: string;
}

export interface FuelPriceView extends FuelPriceSummary {
	previousAverage: number | null;
	delta: number | null;
	trend: PriceTrend;
}

export interface GasPriceSnapshot {
	id?: string | number;
	citySlug: string;
	brandSlug: string;
	snapshotDate: string;
	stationCount: number;
	sourceUpdatedAt: string;
	createdAt?: string;
	fuels: FuelPriceSummary[];
}

export interface GasBrandSummary {
	brand: GasBrand;
	stationCount: number;
	sourceUpdatedAt: string;
	snapshotDate: string;
	fuels: FuelPriceView[];
}

export interface GasBrandStationGroup {
	brand: GasBrand;
	stations: StationData[];
}

export interface GasCityPriceData {
	brands: GasBrandSummary[];
	stations: StationData[];
	fetchedAt: string;
	isPartial: boolean;
}

export interface GasBrandPriceData {
	summary: GasBrandSummary;
	stations: StationData[];
	history: GasPriceSnapshot[];
	historyTotal: number;
	page: number;
	perPage: number;
	relatedBrands: GasBrandSummary[];
	otherCitySlugs: string[];
	fetchedAt: string;
	isPartial: boolean;
}

export interface SnapshotBatchInput {
	cursor: number;
	limit: number;
	dryRun: boolean;
}

export interface SnapshotCityResult {
	citySlug: string;
	brandCount: number;
	snapshotCount: number;
	status: 'processed' | 'skipped' | 'failed';
	error?: string;
}

export interface SnapshotBatchResult {
	cursor: number;
	nextCursor: number | null;
	totalCities: number;
	dryRun: boolean;
	results: SnapshotCityResult[];
}
