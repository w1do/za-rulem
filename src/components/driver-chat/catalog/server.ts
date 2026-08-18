import { loadRecentCityBrandSummaries } from '../../../features/gas-prices/server';
import { cities } from '../../../lib/cities';
import { readLatestCityChatMessages } from './api';
import {
	buildCityChatCatalogCard,
	selectCityChatCatalog,
	type CityChatCatalogCard,
	type CityChatSearchOption,
} from './model';

const CATALOG_HISTORY_MS = 48 * 60 * 60 * 1000;
export const CITY_CHAT_CATALOG_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const EMPTY_CATALOG_CACHE_TTL_MS = 5 * 60 * 1000;

interface CatalogState {
	cache: { expiresAt: number; cards: CityChatCatalogCard[] } | null;
	pending: Promise<CityChatCatalogCard[]> | null;
}

const catalogGlobal = globalThis as typeof globalThis & {
	__zaRulemCityChatCatalog?: CatalogState;
};

const getCatalogState = (): CatalogState => {
	catalogGlobal.__zaRulemCityChatCatalog ??= { cache: null, pending: null };
	return catalogGlobal.__zaRulemCityChatCatalog;
};

const buildCityChatCatalog = async (now: number): Promise<CityChatCatalogCard[]> => {
	const indexableCities = cities.filter((city) => city.isIndexable !== false);
	const since = new Date(now - CATALOG_HISTORY_MS).toISOString();
	const summariesByCity = await loadRecentCityBrandSummaries(since, new Date(now));
	const cards = indexableCities.map((city) =>
		buildCityChatCatalogCard(city, summariesByCity.get(city.slug) ?? [], now),
	);

	const selected = selectCityChatCatalog(
		cards.filter((card): card is CityChatCatalogCard => card !== null),
	);

	return Promise.all(
		selected.map(async (card) => {
			try {
				const messages = await readLatestCityChatMessages(card.city.slug);
				return { ...card, messages };
			} catch (error) {
				console.warn(
					`[city-chat-catalog] Message preview unavailable for ${card.city.slug}:`,
					error,
				);
				return card;
			}
		}),
	);
};

/** Готовит SSR-каталог без раскрытия SDK-моделей и персональных полей сообщений. */
export const getCityChatCatalog = async (now = Date.now()): Promise<CityChatCatalogCard[]> => {
	const state = getCatalogState();
	const currentTime = Date.now();
	if (state.cache && state.cache.expiresAt > currentTime) return state.cache.cards;
	if (state.pending) return state.pending;

	state.pending = buildCityChatCatalog(now);
	try {
		const cards = await state.pending;
		state.cache = {
			expiresAt: currentTime + (cards.length > 0
				? CITY_CHAT_CATALOG_CACHE_TTL_MS
				: EMPTY_CATALOG_CACHE_TTL_MS),
			cards,
		};
		return cards;
	} finally {
		state.pending = null;
	}
};

/** Полный опубликованный справочник для клиентского поиска, независимо от наличия цен. */
export const listCityChatSearchOptions = (): CityChatSearchOption[] =>
	cities
		.filter((city) => city.isIndexable !== false)
		.map((city) => ({
			slug: city.slug,
			name: city.name,
			region: city.region,
			hint: city.hint,
		}))
		.sort((left, right) => left.name.localeCompare(right.name, 'ru-RU'));
