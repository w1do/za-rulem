import { loadRecentCityBrandSummaries } from '../gas-prices/server';
import {
	readCityStationPriceHistory,
	readStationCardsByIds,
} from '../gas-stations/server';
import { cities } from '../../lib/cities';
import { buildCityStationRanking, emptyCityStationRanking } from './model/buildRankings';
import type {
	AzsCityCatalogItem,
	CityStationRankingData,
	RankingKind,
} from './model/types';
import { getOrFetchSwr } from '../../shared/lib/cache/fileSwrCache';

const HISTORY_WINDOW_MS = 48 * 60 * 60 * 1000;
const CACHE_TTL_MS = 5 * 60 * 1000;
const CATALOG_MAX_PRICE_AGE_MS = 24 * 60 * 60 * 1000;
const CATALOG_MAX_FUTURE_SKEW_MS = 60 * 60 * 1000;
const MIN_CORE_FUEL_SAMPLES = 3;
const CATALOG_RANKING_CONCURRENCY = 3;

const buildRanking = async (
	citySlug: string,
	kind: RankingKind,
	now: number,
): Promise<CityStationRankingData> => {
	const since = new Date(now - HISTORY_WINDOW_MS).toISOString();
	const snapshots = await readCityStationPriceHistory(citySlug, since);
	const stationCards = await readStationCardsByIds([
		...new Set(snapshots.map((snapshot) => snapshot.stationId)),
	]);
	return buildCityStationRanking(citySlug, kind, snapshots, stationCards, now);
};

export const getCityStationRanking = async (
	citySlug: string,
	kind: RankingKind,
	now = Date.now(),
): Promise<CityStationRankingData> => {
	const key = `gas-station-rankings:city:${citySlug}:${kind}`;
	return getOrFetchSwr<CityStationRankingData>({
		key,
		ttlMs: CACHE_TTL_MS,
		staleTtlMs: 7 * 24 * 60 * 60 * 1000,
		fallback: emptyCityStationRanking(citySlug, kind),
		fetcher: async () => {
			try {
				return await buildRanking(citySlug, kind, now);
			} catch (error) {
				console.warn(`[gas-station-rankings] Ranking unavailable for ${key}:`, error);
				return emptyCityStationRanking(citySlug, kind);
			}
		},
	});
};

const isRecent = (value: string, now: number): boolean => {
	const timestamp = Date.parse(value);
	return Number.isFinite(timestamp) &&
		timestamp <= now + CATALOG_MAX_FUTURE_SKEW_MS &&
		now - timestamp <= CATALOG_MAX_PRICE_AGE_MS;
};

const buildAzsCityCatalog = async (now: number): Promise<AzsCityCatalogItem[]> => {
	const since = new Date(now - HISTORY_WINDOW_MS).toISOString();
	const summariesByCity = await loadRecentCityBrandSummaries(since, new Date(now));

	const candidates = cities
		.filter((city) => city.isIndexable !== false)
		.flatMap((city): Array<Omit<AzsCityCatalogItem, 'updatedAt'>> => {
			const summaries = summariesByCity.get(city.slug) ?? [];
			const coreFuelSamples = (fuelType: 'AI_92' | 'AI_95'): number => summaries
				.flatMap((summary) => summary.fuels)
				.filter((fuel) => fuel.fuelType === fuelType && isRecent(fuel.updatedAt, now))
				.reduce((sum, fuel) => sum + fuel.sampleCount, 0);
			if (
				coreFuelSamples('AI_92') < MIN_CORE_FUEL_SAMPLES ||
				coreFuelSamples('AI_95') < MIN_CORE_FUEL_SAMPLES
			) return [];

			return [{
				city: {
					slug: city.slug,
					name: city.name,
					region: city.region,
					hint: city.hint,
					isFeatured: city.isFeatured,
				},
			}];
		});
	const readyCities: AzsCityCatalogItem[] = [];

	// Город попадает в каталог и sitemap только после проверки реальных адресных карточек.
	// Небольшие параллельные группы не перегружают Directus запросами истории и реестра АЗС.
	for (let index = 0; index < candidates.length; index += CATALOG_RANKING_CONCURRENCY) {
		const group = candidates.slice(index, index + CATALOG_RANKING_CONCURRENCY);
		const rankings = await Promise.all(group.map(async (candidate) => ({
			candidate,
			ranking: await getCityStationRanking(candidate.city.slug, 'cheapest', now),
		})));
		for (const { candidate, ranking } of rankings) {
			if (!ranking.isIndexable || !ranking.updatedAt) continue;
			readyCities.push({ ...candidate, updatedAt: ranking.updatedAt });
		}
	}

	return readyCities
		.sort((left, right) =>
			Number(right.city.isFeatured) - Number(left.city.isFeatured) ||
			left.city.name.localeCompare(right.city.name, 'ru-RU'),
		);
};

export const getAzsCityCatalog = async (now = Date.now()): Promise<AzsCityCatalogItem[]> => {
	return getOrFetchSwr<AzsCityCatalogItem[]>({
		key: 'gas-station-rankings:catalog',
		ttlMs: CACHE_TTL_MS,
		staleTtlMs: 7 * 24 * 60 * 60 * 1000,
		fallback: [],
		fetcher: async () => {
			try {
				return await buildAzsCityCatalog(now);
			} catch (error) {
				console.warn('[gas-station-rankings] City catalog unavailable:', error);
				return [];
			}
		},
	});
};

export const getGasStationRankingSitemapUrls = async (site: string): Promise<string[]> => {
	const catalog = await getAzsCityCatalog();
	return catalog.flatMap(({ city }) => [
		new URL(`/${city.slug}/azs/deshevye-zapravki`, site).href,
		new URL(`/${city.slug}/azs/dorogie-zapravki`, site).href,
	]);
};

export type {
	AzsCityCatalogItem,
	CityStationRankingData,
	GasStationRankingSection,
	RankedGasStation,
	RankingFuelType,
	RankingKind,
	StationFuelTrend,
} from './model/types';
