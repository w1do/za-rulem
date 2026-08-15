import { decodeSlug, toLatinBrandSlug } from './brandSlug.ts';
import { DEFAULT_GAS_BRANDS } from './defaultBrands.ts';
import type {
	FuelPriceSummary,
	FuelPriceView,
	GasBrand,
	GasBrandSummary,
	GasPriceSnapshot,
	PriceTrend,
} from './types.ts';

export const MAX_FUEL_PRICE_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const HISTORY_POINTS = 30;

/** Реестр всегда живёт в латинских slug: они же используются в публичных URL. */
const toPublicBrand = (brand: GasBrand): GasBrand => ({
	...brand,
	slug: toLatinBrandSlug(brand.slug) || brand.slug,
	sourceSlug: brand.sourceSlug ?? brand.slug,
});

export const mergeBrandRegistry = (brands: GasBrand[]): GasBrand[] => {
	const merged = new Map(
		DEFAULT_GAS_BRANDS.map(toPublicBrand).map((brand) => [brand.slug, brand]),
	);
	for (const brand of brands) {
		const publicBrand = toPublicBrand(brand);
		merged.set(publicBrand.slug, publicBrand);
	}
	return [...merged.values()];
};

const nameFromSlug = (slug: string): string =>
	slug.split('-').filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ') || 'АЗС';

/**
 * Directus хранит снимки по slug сети, который может быть кириллическим.
 * Публичный URL всегда латинский, поэтому исходный slug сохраняем отдельно.
 * Незнакомая сеть остаётся видимой на сайте, но не индексируется, пока её
 * не подтвердили в реестре брендов.
 */
export const resolveGasBrand = (slug: string, registry: readonly GasBrand[]): GasBrand => {
	const publicSlug = toLatinBrandSlug(slug) || slug;
	const known = registry.find((brand) => brand.slug === publicSlug || brand.sourceSlug === slug);
	if (known) return { ...known, slug: known.slug, sourceSlug: slug };
	return {
		slug: publicSlug,
		sourceSlug: slug,
		name: nameFromSlug(decodeSlug(slug)),
		aliases: [],
		isIndexable: false,
		verificationStatus: 'unverified',
	};
};

const isFreshPrice = (updatedAt: string, now: number): boolean => {
	const timestamp = Date.parse(updatedAt);
	return Number.isFinite(timestamp) && timestamp <= now + 24 * 60 * 60 * 1000 &&
		now - timestamp <= MAX_FUEL_PRICE_AGE_MS;
};

const fuelSortIndex = (fuelType: string): number => {
	const order = ['AI_92', 'AI_95', 'AI_98', 'AI_100', 'DT', 'GAS', 'CNG'];
	const index = order.indexOf(fuelType);
	return index === -1 ? order.length : index;
};

/** Устаревшие цены не показываем: лучше пустая карточка, чем цена недельной давности. */
export const selectFreshFuels = (
	fuels: FuelPriceSummary[],
	now = Date.now(),
): FuelPriceSummary[] =>
	fuels
		.filter((fuel) => fuel.average > 0 && isFreshPrice(fuel.updatedAt, now))
		.sort((left, right) => fuelSortIndex(left.fuelType) - fuelSortIndex(right.fuelType));

const trendFromDelta = (delta: number | null): PriceTrend => {
	if (delta === null) return 'unknown';
	if (delta > 0) return 'up';
	if (delta < 0) return 'down';
	return 'stable';
};

export const addPriceTrends = (
	current: FuelPriceSummary[],
	previous?: GasPriceSnapshot,
): FuelPriceView[] =>
	current.map((fuel) => {
		const previousFuel = previous?.fuels.find((item) => item.fuelType === fuel.fuelType);
		const previousAverage = previousFuel?.average ?? null;
		const delta = previousAverage === null
			? null
			: Number((fuel.average - previousAverage).toFixed(2));
		return { ...fuel, previousAverage, delta, trend: trendFromDelta(delta) };
	});

const byBrandSlug = (snapshots: GasPriceSnapshot[]): Map<string, GasPriceSnapshot[]> => {
	const groups = new Map<string, GasPriceSnapshot[]>();
	for (const snapshot of snapshots) {
		const group = groups.get(snapshot.brandSlug) ?? [];
		group.push(snapshot);
		groups.set(snapshot.brandSlug, group);
	}
	for (const group of groups.values()) {
		group.sort((left, right) => left.snapshotDate.localeCompare(right.snapshotDate));
	}
	return groups;
};

/**
 * Текущая цена сети — самый свежий снимок Directus, динамика считается
 * относительно предыдущего снимка того же города и сети.
 */
export const buildBrandSummaries = (
	snapshots: GasPriceSnapshot[],
	brands: GasBrand[] = [],
	now = new Date(),
): GasBrandSummary[] => {
	const registry = mergeBrandRegistry(brands);
	const summaries: GasBrandSummary[] = [];

	for (const [brandSlug, history] of byBrandSlug(snapshots)) {
		const latest = history[history.length - 1];
		if (!latest) continue;
		const previous = history[history.length - 2];
		summaries.push({
			brand: resolveGasBrand(brandSlug, registry),
			stationCount: latest.stationCount,
			sourceUpdatedAt: latest.sourceUpdatedAt,
			snapshotDate: latest.snapshotDate,
			fuels: addPriceTrends(selectFreshFuels(latest.fuels, now.getTime()), previous),
			history: history.slice(-HISTORY_POINTS),
		});
	}

	return summaries.sort((left, right) => {
		if (left.brand.isIndexable !== right.brand.isIndexable) return left.brand.isIndexable ? -1 : 1;
		return right.stationCount - left.stationCount ||
			left.brand.name.localeCompare(right.brand.name, 'ru');
	});
};

export const isBrandReadyForIndexing = (
	summary: GasBrandSummary,
	history: GasPriceSnapshot[],
	now = Date.now(),
): boolean => isGasPriceHistoryReadyForIndexing(
	summary.brand,
	summary.sourceUpdatedAt,
	new Set(history.map((snapshot) => snapshot.snapshotDate)).size,
	now,
);

export const isGasPriceHistoryReadyForIndexing = (
	brand: GasBrand,
	sourceUpdatedAtValue: string,
	snapshotCount: number,
	now = Date.now(),
): boolean => {
	if (!brand.isIndexable || brand.verificationStatus !== 'verified') return false;
	const sourceUpdatedAt = Date.parse(sourceUpdatedAtValue);
	if (!Number.isFinite(sourceUpdatedAt) || now - sourceUpdatedAt > MAX_FUEL_PRICE_AGE_MS) return false;
	return snapshotCount >= 2;
};
