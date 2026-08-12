import type { StationData } from '../../../lib/gasStations.ts';
import { DEFAULT_GAS_BRANDS } from './defaultBrands.ts';
import type {
	FuelPriceSummary,
	FuelPriceView,
	GasBrand,
	GasBrandStationGroup,
	GasBrandSummary,
	GasPriceSnapshot,
	PriceTrend,
} from './types.ts';

export const MAX_FUEL_PRICE_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const BRAND_DESCRIPTOR = /,?\s*(?:автоматическая\s+)?(?:азс|заправочная станция)$/iu;

const TRANSLITERATION: Record<string, string> = {
	а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
	и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
	с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch',
	ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};

export const normalizeBrandName = (value: string): string =>
	value
		.toLocaleLowerCase('ru-RU')
		.replaceAll('ё', 'е')
		.replace(BRAND_DESCRIPTOR, '')
		.replace(/[«»"']/g, '')
		.replace(/\s+/g, ' ')
		.trim();

export const cleanBrandName = (value: string): string =>
	value.replace(BRAND_DESCRIPTOR, '').replace(/\s+/g, ' ').trim();

export const slugifyBrand = (value: string): string => {
	const normalized = cleanBrandName(value).toLocaleLowerCase('ru-RU');
	const transliterated = [...normalized]
		.map((character) => TRANSLITERATION[character] ?? character)
		.join('');
	return transliterated
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80) || 'azs';
};

export const mergeBrandRegistry = (brands: GasBrand[]): GasBrand[] => {
	const merged = new Map(DEFAULT_GAS_BRANDS.map((brand) => [brand.slug, { ...brand }]));
	for (const brand of brands) merged.set(brand.slug, brand);
	return [...merged.values()];
};

const stationBrandName = (station: StationData): string =>
	cleanBrandName(station.station.brand || station.station.name.split(',')[0] || 'АЗС');

export const resolveGasBrand = (value: string, registry: readonly GasBrand[]): GasBrand => {
	const normalized = normalizeBrandName(value);
	const configured = registry.find((brand) =>
		[brand.name, ...brand.aliases].some((alias) => normalizeBrandName(alias) === normalized),
	);
	if (configured) return configured;

	const name = cleanBrandName(value) || 'АЗС';
	const generatedSlug = slugifyBrand(name);
	const slug = registry.some((brand) => brand.slug === generatedSlug)
		? `${generatedSlug}-other`
		: generatedSlug;
	return {
		slug,
		name,
		aliases: [name],
		isIndexable: false,
		verificationStatus: 'unverified',
	};
};

export const groupStationsByBrand = (
	stations: StationData[],
	brands: GasBrand[] = [],
): GasBrandStationGroup[] => {
	const registry = mergeBrandRegistry(brands);
	const groups = new Map<string, GasBrandStationGroup>();

	for (const station of stations) {
		const brand = resolveGasBrand(stationBrandName(station), registry);
		const group = groups.get(brand.slug) ?? { brand, stations: [] };
		group.stations.push(station);
		groups.set(brand.slug, group);
	}

	return [...groups.values()].sort((left, right) => {
		if (left.brand.isIndexable !== right.brand.isIndexable) {
			return left.brand.isIndexable ? -1 : 1;
		}
		return right.stations.length - left.stations.length ||
			left.brand.name.localeCompare(right.brand.name, 'ru');
	});
};

const isFreshPrice = (updatedAt: string, now: number): boolean => {
	const timestamp = Date.parse(updatedAt);
	return Number.isFinite(timestamp) && timestamp <= now + 24 * 60 * 60 * 1000 &&
		now - timestamp <= MAX_FUEL_PRICE_AGE_MS;
};

export const aggregateFuelPrices = (
	stations: StationData[],
	now = Date.now(),
): FuelPriceSummary[] => {
	const pricesByFuel = new Map<string, { prices: number[]; updatedAt: string }>();

	for (const station of stations) {
		for (const price of station.prices ?? []) {
			if (!Number.isFinite(price.price) || price.price <= 0 || !isFreshPrice(price.updated_at, now)) {
				continue;
			}
			const group = pricesByFuel.get(price.fuel_type) ?? { prices: [], updatedAt: '' };
			group.prices.push(price.price);
			if (!group.updatedAt || Date.parse(price.updated_at) > Date.parse(group.updatedAt)) {
				group.updatedAt = price.updated_at;
			}
			pricesByFuel.set(price.fuel_type, group);
		}
	}

	return [...pricesByFuel.entries()]
		.map(([fuelType, group]) => ({
			fuelType,
			average: Number((group.prices.reduce((sum, price) => sum + price, 0) / group.prices.length).toFixed(2)),
			min: Math.min(...group.prices),
			max: Math.max(...group.prices),
			sampleCount: group.prices.length,
			updatedAt: group.updatedAt,
		}))
		.sort((left, right) => fuelSortIndex(left.fuelType) - fuelSortIndex(right.fuelType));
};

const fuelSortIndex = (fuelType: string): number => {
	const order = ['AI_92', 'AI_95', 'AI_98', 'AI_100', 'DT', 'GAS', 'CNG'];
	const index = order.indexOf(fuelType);
	return index === -1 ? order.length : index;
};

/** Начало текущего получасового интервала в локальном времени города. */
export const getSnapshotDate = (stations: StationData[], now = new Date()): string => {
	const offset = stations.find((station) => Number.isFinite(station.station.timezone_offset))
		?.station.timezone_offset ?? 3;
	const localTimestamp = now.getTime() + offset * 60 * 60 * 1000;
	const localDate = new Date(localTimestamp);
	localDate.setUTCMinutes(localDate.getUTCMinutes() < 30 ? 0 : 30, 0, 0);
	return localDate.toISOString().slice(0, 19);
};

export const createGasPriceSnapshots = (
	citySlug: string,
	stations: StationData[],
	brands: GasBrand[] = [],
	now = new Date(),
): Array<{ brand: GasBrand; snapshot: GasPriceSnapshot }> =>
	groupStationsByBrand(stations, brands)
		.map((group) => {
			const fuels = aggregateFuelPrices(group.stations, now.getTime());
			const sourceUpdatedAt = fuels.reduce(
				(latest, fuel) => (!latest || Date.parse(fuel.updatedAt) > Date.parse(latest) ? fuel.updatedAt : latest),
				'',
			);
			return {
				brand: group.brand,
				snapshot: {
					citySlug,
					brandSlug: group.brand.slug,
					snapshotDate: getSnapshotDate(group.stations, now),
					stationCount: group.stations.length,
					sourceUpdatedAt,
					fuels,
				},
			};
		})
		.filter(({ snapshot }) => snapshot.fuels.length > 0);

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

export const buildBrandSummaries = (
	citySlug: string,
	stations: StationData[],
	history: GasPriceSnapshot[],
	brands: GasBrand[] = [],
	now = new Date(),
): GasBrandSummary[] => {
	const groups = groupStationsByBrand(stations, brands);
	return groups.map(({ brand, stations: brandStations }) => {
		const fuels = aggregateFuelPrices(brandStations, now.getTime());
		const sourceUpdatedAt = fuels.reduce(
			(latest, fuel) => (!latest || Date.parse(fuel.updatedAt) > Date.parse(latest) ? fuel.updatedAt : latest),
			'',
		);
		const snapshot: GasPriceSnapshot = {
			citySlug,
			brandSlug: brand.slug,
			snapshotDate: getSnapshotDate(brandStations, now),
			stationCount: brandStations.length,
			sourceUpdatedAt,
			fuels,
		};
		const brandHistory = history
			.filter((item) => item.brandSlug === brand.slug)
			.sort((left, right) => left.snapshotDate.localeCompare(right.snapshotDate));
		const previous = brandHistory
			.filter((item) => item.snapshotDate < snapshot.snapshotDate)
			.sort((left, right) => right.snapshotDate.localeCompare(left.snapshotDate))[0];
		return {
			brand,
			stationCount: snapshot.stationCount,
			sourceUpdatedAt: snapshot.sourceUpdatedAt,
			snapshotDate: snapshot.snapshotDate,
			fuels: addPriceTrends(snapshot.fuels, previous),
			history: brandHistory.slice(-30),
		};
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
