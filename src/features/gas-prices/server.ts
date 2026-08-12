import { cities, type ChatCity } from '../../lib/cities';
import {
	ensureGasBrand,
	readBrandCitySlugs,
	readCitySnapshots,
	readGasBrands,
	readRecentSnapshots,
	upsertGasPriceSnapshot,
} from './api/directusGasPrices';
import { fetchCachedGasStations } from './api/stationCache';
import {
	buildBrandSummaries,
	createGasPriceSnapshots,
	groupStationsByBrand,
	isBrandReadyForIndexing,
	mergeBrandRegistry,
} from './model/aggregate';
import { gasPricesUrl } from './model/urls';
import type {
	GasBrand,
	GasBrandPriceData,
	GasCityPriceData,
	GasPriceSnapshot,
	SnapshotBatchInput,
	SnapshotBatchResult,
} from './model/types';

const HISTORY_PER_PAGE = 30;

const optional = async <T>(operation: () => Promise<T>, fallback: T, label: string): Promise<T> => {
	try {
		return await operation();
	} catch (error) {
		console.error(`[gas-prices] ${label}:`, error instanceof Error ? error.message : error);
		return fallback;
	}
};

const loadBrands = (): Promise<GasBrand[]> => optional(readGasBrands, [], 'brand registry unavailable');
const loadHistory = (citySlug: string): Promise<GasPriceSnapshot[]> =>
	optional(() => readCitySnapshots(citySlug), [], `history unavailable for ${citySlug}`);

export class GasBrandNotFoundError extends Error {}

const loadCityPriceContext = async (city: ChatCity) => {
	const [stationResult, brands, history] = await Promise.all([
		fetchCachedGasStations(city.bounds),
		loadBrands(),
		loadHistory(city.slug),
	]);
	return { stationResult, brands, history };
};

export const getGasCityPriceData = async (city: ChatCity): Promise<GasCityPriceData> => {
	const { stationResult, brands, history } = await loadCityPriceContext(city);
	return {
		brands: buildBrandSummaries(city.slug, stationResult.stations, history, brands),
		stations: stationResult.stations,
		fetchedAt: new Date().toISOString(),
		isPartial: !stationResult.isSuccessful,
	};
};

export const getGasBrandPriceData = async (
	city: ChatCity,
	brandSlug: string,
	page = 1,
): Promise<GasBrandPriceData> => {
	const { stationResult, brands, history: allHistory } = await loadCityPriceContext(city);
	const summaries = buildBrandSummaries(city.slug, stationResult.stations, allHistory, brands);
	const summary = summaries.find((item) => item.brand.slug === brandSlug);
	if (!summary) throw new GasBrandNotFoundError(`АЗС ${brandSlug} не найдена в городе ${city.slug}`);
	const brandHistory = allHistory
		.filter((snapshot) => snapshot.brandSlug === brandSlug)
		.sort((left, right) => right.snapshotDate.localeCompare(left.snapshotDate));
	const safePage = Math.max(1, Math.floor(page));
	const start = (safePage - 1) * HISTORY_PER_PAGE;
	const group = groupStationsByBrand(stationResult.stations, [summary.brand])
		.find((item) => item.brand.slug === brandSlug);
	const otherCitySlugs = await optional(
		() => readBrandCitySlugs(brandSlug),
		[],
		`city links unavailable for ${brandSlug}`,
	);
	return {
		summary,
		stations: group?.stations ?? [],
		history: brandHistory.slice(start, start + HISTORY_PER_PAGE),
		historyTotal: brandHistory.length,
		page: safePage,
		perPage: HISTORY_PER_PAGE,
		relatedBrands: summaries.filter((item) => item.brand.slug !== brandSlug).slice(0, 8),
		otherCitySlugs,
		fetchedAt: new Date().toISOString(),
		isPartial: !stationResult.isSuccessful,
	};
};

export interface SnapshotBatchDependencies {
	cityList: ChatCity[];
	loadBrands: () => Promise<GasBrand[]>;
	fetchStations: typeof fetchCachedGasStations;
	ensureBrand: typeof ensureGasBrand;
	upsertSnapshot: typeof upsertGasPriceSnapshot;
}

const defaultBatchDependencies: SnapshotBatchDependencies = {
	cityList: cities,
	loadBrands,
	fetchStations: fetchCachedGasStations,
	ensureBrand: ensureGasBrand,
	upsertSnapshot: upsertGasPriceSnapshot,
};

export const collectGasPriceSnapshotBatch = async (
	input: SnapshotBatchInput,
	dependencies: SnapshotBatchDependencies = defaultBatchDependencies,
): Promise<SnapshotBatchResult> => {
	const selectedCities = dependencies.cityList.slice(input.cursor, input.cursor + input.limit);
	const registry = mergeBrandRegistry(await dependencies.loadBrands());
	const results = [];
	for (const city of selectedCities) {
		try {
			const stationResult = await dependencies.fetchStations(city.bounds);
			if (!stationResult.isSuccessful) {
				results.push({ citySlug: city.slug, brandCount: 0, snapshotCount: 0, status: 'skipped' as const });
				continue;
			}
			const snapshots = createGasPriceSnapshots(city.slug, stationResult.stations, registry);
			if (!input.dryRun) {
				for (const { brand, snapshot } of snapshots) {
					await dependencies.ensureBrand(brand);
					await dependencies.upsertSnapshot(snapshot);
				}
			}
			results.push({
				citySlug: city.slug,
				brandCount: new Set(snapshots.map(({ brand }) => brand.slug)).size,
				snapshotCount: snapshots.length,
				status: 'processed' as const,
			});
		} catch (error) {
			results.push({
				citySlug: city.slug,
				brandCount: 0,
				snapshotCount: 0,
				status: 'failed' as const,
				error: error instanceof Error ? error.message : 'Unknown error',
			});
		}
	}
	const nextCursor = input.cursor + selectedCities.length;
	return {
		cursor: input.cursor,
		nextCursor: nextCursor < dependencies.cityList.length ? nextCursor : null,
		totalCities: dependencies.cityList.length,
		dryRun: input.dryRun,
		results,
	};
};

export const getGasPriceSitemapUrls = async (site: string): Promise<string[]> => {
	const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
	const [brands, snapshots] = await Promise.all([
		loadBrands(),
		optional(() => readRecentSnapshots(since), [], 'sitemap history unavailable'),
	]);
	const registry = mergeBrandRegistry(brands);
	const groups = new Map<string, GasPriceSnapshot[]>();
	for (const snapshot of snapshots) {
		const key = `${snapshot.citySlug}:${snapshot.brandSlug}`;
		groups.set(key, [...(groups.get(key) ?? []), snapshot]);
	}
	const urls: string[] = [];
	for (const [key, history] of groups) {
		const [citySlug = '', brandSlug = ''] = key.split(':');
		const city = cities.find((item) => item.slug === citySlug && item.isIndexable !== false);
		const brand = registry.find((item) => item.slug === brandSlug);
		const latest = history.sort((a, b) => b.snapshotDate.localeCompare(a.snapshotDate))[0];
		if (!city || !brand || !latest) continue;
		const summary = {
			brand,
			stationCount: latest.stationCount,
			sourceUpdatedAt: latest.sourceUpdatedAt,
			snapshotDate: latest.snapshotDate,
			fuels: [],
		};
		if (isBrandReadyForIndexing(summary, history)) {
			urls.push(new URL(gasPricesUrl(city.slug, brand.slug), site).href);
		}
	}
	return urls;
};
