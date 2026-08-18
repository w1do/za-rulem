import type { GasBrandSummary, PriceTrend } from '../../../features/gas-prices/model/types';
import type { ChatCity } from '../../../lib/cities';
import type { ChatTopic } from '../model/types';

export const CITY_CHAT_FUELS = ['AI_92', 'AI_95', 'AI_100', 'DT'] as const;

export type CityChatFuelType = (typeof CITY_CHAT_FUELS)[number];

export interface CityChatFuelView {
	fuelType: CityChatFuelType;
	label: string;
	average: number | null;
	delta: number | null;
	trend: PriceTrend;
	sampleCount: number;
	updatedAt: string | null;
}

export interface CityChatMessagePreview {
	id: string;
	text: string;
	topic: ChatTopic;
	createdAt: string | null;
}

export interface CityChatCatalogCard {
	city: Pick<ChatCity, 'slug' | 'name' | 'region' | 'hint'>;
	stationCount: number;
	totalSamples: number;
	coreCoverage: number;
	updatedAt: string;
	fuels: CityChatFuelView[];
	messages: CityChatMessagePreview[];
}

export interface CityChatSearchOption {
	slug: string;
	name: string;
	region: string;
	hint: string;
}

export interface CityChatCatalogData {
	cards: CityChatCatalogCard[];
	cities: CityChatSearchOption[];
}

export const CITY_CHAT_MAX_DATA_AGE_MS = 24 * 60 * 60 * 1000;
export const CITY_CHAT_MIN_GASOLINE_SAMPLES = 3;
export const CITY_CHAT_MIN_ADDITIONAL_FUEL_SAMPLES = 2;
export const CITY_CHAT_CATALOG_LIMIT = 10;
export const CITY_CHAT_SEARCH_RESULT_LIMIT = 10;

const FUEL_LABELS: Record<CityChatFuelType, string> = {
	AI_92: 'АИ-92',
	AI_95: 'АИ-95',
	AI_100: 'АИ-100',
	DT: 'ДТ',
};

const isCityChatFuelType = (value: string): value is CityChatFuelType =>
	CITY_CHAT_FUELS.some((fuelType) => fuelType === value);

const normalizeDate = (value: string): string =>
	/(Z|[+-]\d{2}:?\d{2})$/.test(value) ? value : `${value}Z`;

const toTimestamp = (value: string): number => Date.parse(normalizeDate(value));

const isFresh = (value: string, now: number): boolean => {
	const timestamp = toTimestamp(value);
	return Number.isFinite(timestamp) && timestamp <= now + 60 * 60 * 1000 &&
		now - timestamp <= CITY_CHAT_MAX_DATA_AGE_MS;
};

const roundPrice = (value: number): number => Number(value.toFixed(2));

const trendFromDelta = (delta: number | null): PriceTrend => {
	if (delta === null) return 'unknown';
	if (delta > 0) return 'up';
	if (delta < 0) return 'down';
	return 'stable';
};

const buildFuelView = (
	summaries: GasBrandSummary[],
	fuelType: CityChatFuelType,
	now: number,
): CityChatFuelView => {
	const entries = summaries
		.flatMap((summary) => summary.fuels)
		.filter((fuel) =>
			fuel.fuelType === fuelType &&
			fuel.sampleCount > 0 &&
			fuel.average > 0 &&
			isFresh(fuel.updatedAt, now),
		);

	if (entries.length === 0) {
		return {
			fuelType,
			label: FUEL_LABELS[fuelType],
			average: null,
			delta: null,
			trend: 'unknown',
			sampleCount: 0,
			updatedAt: null,
		};
	}

	const sampleCount = entries.reduce((sum, fuel) => sum + fuel.sampleCount, 0);
	const average = roundPrice(
		entries.reduce((sum, fuel) => sum + fuel.average * fuel.sampleCount, 0) / sampleCount,
	);
	const comparable = entries.filter((fuel) => fuel.previousAverage !== null);
	const comparableCount = comparable.reduce((sum, fuel) => sum + fuel.sampleCount, 0);
	const delta = comparableCount === 0
		? null
		: roundPrice(
			comparable.reduce(
				(sum, fuel) => sum + (fuel.average - (fuel.previousAverage ?? fuel.average)) * fuel.sampleCount,
				0,
			) / comparableCount,
		);
	const updatedAt = entries
		.map((fuel) => fuel.updatedAt)
		.sort((left, right) => toTimestamp(right) - toTimestamp(left))[0] ?? null;

	return {
		fuelType,
		label: FUEL_LABELS[fuelType],
		average,
		delta,
		trend: trendFromDelta(delta),
		sampleCount,
		updatedAt,
	};
};

/**
 * В каталог попадают только города с широким свежим срезом: АИ-92 и АИ-95
 * обязательны, а третьим видом должен быть АИ-100 или ДТ. Это показатель
 * полноты мониторинга, а не гарантия остатка топлива на конкретной АЗС.
 */
export const buildCityChatCatalogCard = (
	city: ChatCity,
	summaries: GasBrandSummary[],
	now = Date.now(),
): CityChatCatalogCard | null => {
	const fuels = CITY_CHAT_FUELS.map((fuelType) => buildFuelView(summaries, fuelType, now));
	const fuelByType = new Map(fuels.map((fuel) => [fuel.fuelType, fuel]));
	const ai92Samples = fuelByType.get('AI_92')?.sampleCount ?? 0;
	const ai95Samples = fuelByType.get('AI_95')?.sampleCount ?? 0;
	const ai100Samples = fuelByType.get('AI_100')?.sampleCount ?? 0;
	const dieselSamples = fuelByType.get('DT')?.sampleCount ?? 0;

	if (
		ai92Samples < CITY_CHAT_MIN_GASOLINE_SAMPLES ||
		ai95Samples < CITY_CHAT_MIN_GASOLINE_SAMPLES ||
		Math.max(ai100Samples, dieselSamples) < CITY_CHAT_MIN_ADDITIONAL_FUEL_SAMPLES
	) {
		return null;
	}

	const updatedAt = fuels
		.map((fuel) => fuel.updatedAt)
		.filter((value): value is string => value !== null)
		.sort((left, right) => toTimestamp(right) - toTimestamp(left))[0];
	if (!updatedAt) return null;

	const contributingBrands = summaries.filter((summary) =>
		summary.fuels.some((fuel) =>
			isCityChatFuelType(fuel.fuelType) && isFresh(fuel.updatedAt, now),
		),
	);

	return {
		city: {
			slug: city.slug,
			name: city.name,
			region: city.region,
			hint: city.hint,
		},
		stationCount: contributingBrands.reduce((sum, summary) => sum + summary.stationCount, 0),
		totalSamples: fuels.reduce((sum, fuel) => sum + fuel.sampleCount, 0),
		coreCoverage: Math.min(ai92Samples, ai95Samples),
		updatedAt,
		fuels,
		messages: [],
	};
};

export const sortCityChatCatalog = (cards: CityChatCatalogCard[]): CityChatCatalogCard[] =>
	[...cards].sort((left, right) =>
		right.coreCoverage - left.coreCoverage ||
		right.totalSamples - left.totalSamples ||
		left.city.name.localeCompare(right.city.name, 'ru-RU'),
	);

export const selectCityChatCatalog = (
	cards: CityChatCatalogCard[],
	limit = CITY_CHAT_CATALOG_LIMIT,
): CityChatCatalogCard[] => sortCityChatCatalog(cards).slice(0, limit);

/** Карточка считается живой только после получения хотя бы одного сообщения. */
export const attachCityChatMessages = (
	card: CityChatCatalogCard,
	messages: CityChatMessagePreview[],
): CityChatCatalogCard | null => messages.length > 0 ? { ...card, messages } : null;

export const buildActiveCityChatSearchOptions = (
	cityList: ChatCity[],
	activeCitySlugs: ReadonlySet<string>,
): CityChatSearchOption[] =>
	cityList
		.filter((city) => city.isIndexable !== false && activeCitySlugs.has(city.slug))
		.map((city) => ({
			slug: city.slug,
			name: city.name,
			region: city.region,
			hint: city.hint,
		}))
		.sort((left, right) => left.name.localeCompare(right.name, 'ru-RU'));

const normalizeSearchValue = (value: string): string =>
	value
		.toLocaleLowerCase('ru-RU')
		.replaceAll('ё', 'е')
		.replace(/[^a-zа-я0-9]+/gi, ' ')
		.trim();

/** Ищет по справочнику живых чатов, а не только по рекомендованной десятке. */
export const searchCityChatOptions = (
	options: CityChatSearchOption[],
	query: string,
	limit = CITY_CHAT_SEARCH_RESULT_LIMIT,
): CityChatSearchOption[] => {
	const normalizedQuery = normalizeSearchValue(query);
	if (!normalizedQuery) return [];

	const terms = normalizedQuery.split(/\s+/);
	return options
		.map((option) => {
			const normalizedName = normalizeSearchValue(option.name);
			const searchable = normalizeSearchValue(
				`${option.name} ${option.region} ${option.hint} ${option.slug}`,
			);
			const matches = terms.every((term) => searchable.includes(term));
			const rank = normalizedName === normalizedQuery
				? 0
				: normalizedName.startsWith(normalizedQuery)
					? 1
					: 2;

			return { option, matches, rank };
		})
		.filter((item) => item.matches)
		.sort((left, right) =>
			left.rank - right.rank || left.option.name.localeCompare(right.option.name, 'ru-RU'),
		)
		.slice(0, limit)
		.map((item) => item.option);
};
