import type { StationData } from '../../../lib/gasStations.ts';
import type { StationPricesSnapshot } from '../../gas-stations/index.ts';
import {
	RANKING_FUEL_TYPES,
	type CityStationRankingData,
	type GasStationRankingSection,
	type RankedGasStation,
	type RankingFuelType,
	type RankingKind,
	type RankingPriceTrend,
	type StationFuelTrend,
} from './types.ts';

export const RANKING_LIMIT = 5;
export const MAX_RANKING_PRICE_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_FUTURE_SKEW_MS = 60 * 60 * 1000;
const MIN_INDEXABLE_STATIONS_PER_CORE_FUEL = 3;

const FUEL_LABELS: Record<RankingFuelType, string> = {
	AI_92: 'АИ-92',
	AI_95: 'АИ-95',
	AI_100: 'АИ-100',
	DT: 'ДТ',
};

const normalizeDate = (value: string): string =>
	/(Z|[+-]\d{2}:?\d{2})$/.test(value) ? value : `${value}Z`;

const toTimestamp = (value: string): number => Date.parse(normalizeDate(value));

const isFresh = (value: string, now: number): boolean => {
	const timestamp = toTimestamp(value);
	return Number.isFinite(timestamp) &&
		timestamp <= now + MAX_FUTURE_SKEW_MS &&
		now - timestamp <= MAX_RANKING_PRICE_AGE_MS;
};

const roundPrice = (value: number): number => Number(value.toFixed(2));

const trendFromDelta = (delta: number | null): RankingPriceTrend => {
	if (delta === null) return 'unknown';
	if (delta > 0) return 'up';
	if (delta < 0) return 'down';
	return 'stable';
};

const priceFor = (snapshot: StationPricesSnapshot | undefined, fuelType: RankingFuelType) =>
	snapshot?.prices.find((price) => price.fuel_type === fuelType && price.price > 0);

const buildFuelTrend = (
	current: StationPricesSnapshot,
	previous: StationPricesSnapshot | undefined,
	fuelType: RankingFuelType,
	now: number,
): StationFuelTrend => {
	const currentPrice = priceFor(current, fuelType);
	const freshCurrent = currentPrice && isFresh(currentPrice.updated_at, now) ? currentPrice : undefined;
	const previousPrice = priceFor(previous, fuelType);
	const previousValue = freshCurrent && previousPrice ? previousPrice.price : null;
	const delta = freshCurrent && previousValue !== null
		? roundPrice(freshCurrent.price - previousValue)
		: null;

	return {
		fuelType,
		label: FUEL_LABELS[fuelType],
		currentPrice: freshCurrent?.price ?? null,
		previousPrice: previousValue,
		delta,
		trend: trendFromDelta(delta),
		updatedAt: freshCurrent?.updated_at ?? null,
	};
};

const groupSnapshots = (
	snapshots: StationPricesSnapshot[],
): Map<string, StationPricesSnapshot[]> => {
	const groups = new Map<string, StationPricesSnapshot[]>();
	for (const snapshot of snapshots) {
		const group = groups.get(snapshot.stationId) ?? [];
		group.push(snapshot);
		groups.set(snapshot.stationId, group);
	}

	for (const group of groups.values()) {
		group.sort((left, right) => toTimestamp(right.snapshotDate) - toTimestamp(left.snapshotDate));
	}

	return groups;
};

const buildStation = (
	station: StationData,
	history: StationPricesSnapshot[],
	now: number,
): Omit<RankedGasStation, 'rank'> | null => {
	const current = history[0];
	if (!current || station.closed || !station.station.name.trim() || !station.station.address.trim()) {
		return null;
	}

	const prices = RANKING_FUEL_TYPES.map((fuelType) =>
		buildFuelTrend(current, history[1], fuelType, now),
	);
	const updatedAt = prices
		.map((price) => price.updatedAt)
		.filter((value): value is string => value !== null)
		.sort((left, right) => toTimestamp(right) - toTimestamp(left))[0];
	if (!updatedAt) return null;

	return {
		id: station.station.id,
		name: station.station.name,
		brand: station.station.brand,
		address: station.station.address,
		updatedAt,
		prices,
	};
};

const rankingPrice = (
	station: Omit<RankedGasStation, 'rank'>,
	fuelType: RankingFuelType,
): number | null => station.prices.find((price) => price.fuelType === fuelType)?.currentPrice ?? null;

const buildSection = (
	stations: Omit<RankedGasStation, 'rank'>[],
	fuelType: RankingFuelType,
	kind: RankingKind,
	limit: number,
): GasStationRankingSection => {
	const direction = kind === 'cheapest' ? 1 : -1;
	const ranked = stations
		.filter((station) => rankingPrice(station, fuelType) !== null)
		.sort((left, right) => {
			const leftPrice = rankingPrice(left, fuelType) ?? 0;
			const rightPrice = rankingPrice(right, fuelType) ?? 0;
			return direction * (leftPrice - rightPrice) ||
				toTimestamp(right.updatedAt) - toTimestamp(left.updatedAt) ||
				left.name.localeCompare(right.name, 'ru-RU') ||
				left.address.localeCompare(right.address, 'ru-RU');
		})
		.slice(0, limit)
		.map((station, index) => ({ ...station, rank: index + 1 }));

	return { fuelType, label: FUEL_LABELS[fuelType], stations: ranked };
};

export const buildCityStationRanking = (
	citySlug: string,
	kind: RankingKind,
	snapshots: StationPricesSnapshot[],
	stationCards: Map<string, StationData>,
	now = Date.now(),
	limit = RANKING_LIMIT,
): CityStationRankingData => {
	const histories = groupSnapshots(snapshots);
	const stations = [...histories]
		.map(([stationId, history]) => {
			const station = stationCards.get(stationId);
			return station ? buildStation(station, history, now) : null;
		})
		.filter((station): station is Omit<RankedGasStation, 'rank'> => station !== null);
	const sections = RANKING_FUEL_TYPES.map((fuelType) =>
		buildSection(stations, fuelType, kind, limit),
	);
	const sectionsByFuel = new Map(sections.map((section) => [section.fuelType, section]));
	const updatedAt = stations
		.map((station) => station.updatedAt)
		.sort((left, right) => toTimestamp(right) - toTimestamp(left))[0] ?? null;

	return {
		citySlug,
		kind,
		sections,
		totalStations: stations.length,
		updatedAt,
		isIndexable:
			(sectionsByFuel.get('AI_92')?.stations.length ?? 0) >= MIN_INDEXABLE_STATIONS_PER_CORE_FUEL &&
			(sectionsByFuel.get('AI_95')?.stations.length ?? 0) >= MIN_INDEXABLE_STATIONS_PER_CORE_FUEL,
	};
};

export const emptyCityStationRanking = (
	citySlug: string,
	kind: RankingKind,
): CityStationRankingData => ({
	citySlug,
	kind,
	sections: RANKING_FUEL_TYPES.map((fuelType) => ({
		fuelType,
		label: FUEL_LABELS[fuelType],
		stations: [],
	})),
	totalStations: 0,
	updatedAt: null,
	isIndexable: false,
});
