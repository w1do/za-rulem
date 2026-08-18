import { loadRecentCityBrandSummaries } from '../../../features/gas-prices/server';
import { cities } from '../../../lib/cities';
import { readActiveCityChatSlugs, readLatestCityChatMessages } from './api';
import {
	buildCityChatCatalogCard,
	attachCityChatMessages,
	buildActiveCityChatSearchOptions,
	selectCityChatCatalog,
	type CityChatCatalogCard,
	type CityChatCatalogData,
} from './model';

const CATALOG_HISTORY_MS = 48 * 60 * 60 * 1000;
export const CITY_CHAT_CATALOG_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const EMPTY_CATALOG_CACHE_TTL_MS = 5 * 60 * 1000;

interface CatalogState {
	cache: { expiresAt: number; data: CityChatCatalogData } | null;
	pending: Promise<CityChatCatalogData> | null;
}

const catalogGlobal = globalThis as typeof globalThis & {
	__zaRulemCityChatCatalog?: CatalogState;
};

const getCatalogState = (): CatalogState => {
	catalogGlobal.__zaRulemCityChatCatalog ??= { cache: null, pending: null };
	return catalogGlobal.__zaRulemCityChatCatalog;
};

const buildCityChatCatalog = async (now: number): Promise<CityChatCatalogData> => {
	let activeCitySlugs: Set<string>;
	try {
		activeCitySlugs = await readActiveCityChatSlugs();
	} catch (error) {
		console.warn('[city-chat-catalog] Active city list unavailable:', error);
		return { cards: [], cities: [] };
	}

	const activeCities = cities.filter((city) =>
		city.isIndexable !== false && activeCitySlugs.has(city.slug),
	);
	if (activeCities.length === 0) return { cards: [], cities: [] };

	const since = new Date(now - CATALOG_HISTORY_MS).toISOString();
	const summariesByCity = await loadRecentCityBrandSummaries(since, new Date(now));
	const cards = activeCities.map((city) =>
		buildCityChatCatalogCard(city, summariesByCity.get(city.slug) ?? [], now),
	);
	const selected = selectCityChatCatalog(
		cards.filter((card): card is CityChatCatalogCard => card !== null),
	);

	const cardsWithMessages = await Promise.all(
		selected.map(async (card): Promise<CityChatCatalogCard | null> => {
			try {
				const messages = await readLatestCityChatMessages(card.city.slug);
				return attachCityChatMessages(card, messages);
			} catch (error) {
				console.warn(
					`[city-chat-catalog] Message preview unavailable for ${card.city.slug}:`,
					error,
				);
				return null;
			}
		}),
	);

	return {
		cards: cardsWithMessages.filter((card): card is CityChatCatalogCard => card !== null),
		cities: buildActiveCityChatSearchOptions(cities, activeCitySlugs),
	};
};

/** Готовит SSR-каталог и поиск только по городам с непустыми сообщениями. */
export const getCityChatCatalog = async (now = Date.now()): Promise<CityChatCatalogData> => {
	const state = getCatalogState();
	const currentTime = Date.now();
	if (state.cache && state.cache.expiresAt > currentTime) return state.cache.data;
	if (state.pending) return state.pending;

	state.pending = buildCityChatCatalog(now);
	try {
		const data = await state.pending;
		state.cache = {
			expiresAt: currentTime + (data.cards.length > 0
				? CITY_CHAT_CATALOG_CACHE_TTL_MS
				: EMPTY_CATALOG_CACHE_TTL_MS),
			data,
		};
		return data;
	} finally {
		state.pending = null;
	}
};
