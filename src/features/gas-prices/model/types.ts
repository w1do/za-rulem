export const PRIMARY_FUEL_TYPES = ['AI_92', 'AI_95', 'DT'] as const;

export type PriceTrend = 'up' | 'down' | 'stable' | 'unknown';

export interface GasBrand {
	/** Латинский slug для публичного URL. */
	slug: string;
	/** Исходный slug сети в Directus, может быть кириллическим. */
	sourceSlug?: string;
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

/** Агрегированный снимок цен сети в городе, подготовленный внешним парсером. */
export interface GasPriceSnapshot {
	id?: string | number;
	areaType: 'city' | 'road' | 'point';
	areaSlug: string;
	brandSlug: string;
	snapshotDate: string;
	stationCount: number;
	sourceUpdatedAt: string;
	createdAt?: string;
	fuels: FuelPriceSummary[];
}

/** Компактная проекция Directus, используемая только при сборке sitemap. */
export interface GasPriceSitemapEntry {
	areaType: 'city' | 'road';
	areaSlug: string;
	brandSlug: string;
	snapshotCount: number;
	latestSnapshotDate: string;
	sourceUpdatedAt: string;
}

export interface GasBrandSummary {
	brand: GasBrand;
	stationCount: number;
	sourceUpdatedAt: string;
	snapshotDate: string;
	fuels: FuelPriceView[];
	history: GasPriceSnapshot[];
}

export interface GasCityPriceData {
	brands: GasBrandSummary[];
	fetchedAt: string;
}

export interface GasBrandPriceData {
	summary: GasBrandSummary;
	history: GasPriceSnapshot[];
	historyTotal: number;
	page: number;
	perPage: number;
	relatedBrands: GasBrandSummary[];
	otherAreaSlugs: string[];
	fetchedAt: string;
}
