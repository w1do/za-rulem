import type {
	FuelPriceSummary,
	GasBrand,
	GasPriceSitemapEntry,
	GasPriceSnapshot,
} from '../model/types';

/** Сырые ответы Directus. Наружу feature отдаёт только доменные модели. */
export interface GasBrandDto {
	slug?: unknown;
	name?: unknown;
	aliases?: unknown;
	is_indexable?: unknown;
	verification_status?: unknown;
}

export interface GasPriceSnapshotDto {
	id?: unknown;
	city_slug?: unknown;
	area_type?: unknown;
	area_slug?: unknown;
	brand_slug?: unknown;
	snapshot_date?: unknown;
	station_count?: unknown;
	source_updated_at?: unknown;
	date_created?: unknown;
	fuel_prices?: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null;

const stringValue = (value: unknown): string => (typeof value === 'string' ? value : '');

const numberValue = (value: unknown): number => (Number.isFinite(Number(value)) ? Number(value) : 0);

export const toFuelPriceSummary = (value: unknown): FuelPriceSummary | null => {
	if (!isRecord(value)) return null;
	const fuelType = stringValue(value.fuelType ?? value.fuel_type);
	const updatedAt = stringValue(value.updatedAt ?? value.updated_at);
	const average = numberValue(value.average);
	if (!fuelType || !updatedAt || average <= 0) return null;
	return {
		fuelType,
		average,
		min: numberValue(value.min),
		max: numberValue(value.max),
		sampleCount: numberValue(value.sampleCount ?? value.sample_count),
		updatedAt,
	};
};

export const toGasBrand = (value: unknown): GasBrand | null => {
	if (!isRecord(value)) return null;
	const slug = stringValue(value.slug);
	const name = stringValue(value.name);
	if (!slug || !name) return null;
	const aliases = Array.isArray(value.aliases)
		? value.aliases.filter((alias): alias is string => typeof alias === 'string')
		: [];
	return {
		slug,
		name,
		aliases,
		isIndexable: value.is_indexable === true,
		verificationStatus: value.verification_status === 'verified' ? 'verified' : 'unverified',
	};
};

export const toGasPriceSnapshot = (value: unknown): GasPriceSnapshot | null => {
	if (!isRecord(value)) return null;
	const areaType = stringValue(value.area_type || 'city') as GasPriceSnapshot['areaType'];
	const areaSlug = stringValue(value.area_slug || value.city_slug || value.segment_slug);
	const brandSlug = stringValue(value.brand_slug);
	const snapshotDate = stringValue(value.snapshot_date);

	if (!areaSlug || !brandSlug || !snapshotDate) return null;

	const fuels = Array.isArray(value.fuel_prices)
		? value.fuel_prices
				.map(toFuelPriceSummary)
				.filter((fuel): fuel is FuelPriceSummary => fuel !== null)
		: [];
	return {
		id: typeof value.id === 'string' || typeof value.id === 'number' ? value.id : undefined,
		areaType,
		areaSlug,
		brandSlug,
		snapshotDate,
		stationCount: numberValue(value.station_count),
		sourceUpdatedAt: stringValue(value.source_updated_at),
		createdAt: stringValue(value.date_created) || undefined,
		fuels,
	};
};

export const toGasPriceSitemapEntry = (value: unknown): GasPriceSitemapEntry | null => {
	if (!isRecord(value) || !isRecord(value.count) || !isRecord(value.max)) return null;
	const areaType = stringValue(value.area_type || 'city') as GasPriceSitemapEntry['areaType'];
	const areaSlug = stringValue(value.area_slug || value.city_slug || value.segment_slug);
	const brandSlug = stringValue(value.brand_slug);
	const latestSnapshotDate = stringValue(value.max.snapshot_date);
	const sourceUpdatedAt = stringValue(value.max.source_updated_at);
	const snapshotCount = numberValue(value.count.id);
	if (!areaSlug || !brandSlug || !latestSnapshotDate || snapshotCount < 1) return null;
	return { areaType, areaSlug, brandSlug, snapshotCount, latestSnapshotDate, sourceUpdatedAt };
};

export const readRecordString = (value: unknown, key: string): string =>
	isRecord(value) ? stringValue(value[key]) : '';

export const readMetaCount = (payload: unknown): number =>
	isRecord(payload) && isRecord(payload.meta) ? numberValue(payload.meta.filter_count) : 0;

export const readDataItems = (payload: unknown): unknown[] =>
	isRecord(payload) && Array.isArray(payload.data) ? payload.data : [];
