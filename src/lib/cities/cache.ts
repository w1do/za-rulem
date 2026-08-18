import { CACHE_TTL_MS } from './config';
import type { ChatCity } from './types';
import { readSwrEntry, writeSwrEntry } from '../../shared/lib/cache/fileSwrCache';

const SWR_CITIES_KEY = 'cities:published';

type CitiesCache = {
	/** Запрос в полёте: параллельные рендеры ждут его вместо своего запроса. */
	inFlight: Promise<ChatCity[]> | null;
};

// Кеш живёт на globalThis: при сборке модуль может попасть в несколько чанков,
// и каждый экземпляр модуля иначе делал бы собственный запрос в Directus.
const CACHE_KEY = '__zaRulemCitiesCache';
const globalScope = globalThis as typeof globalThis & { [CACHE_KEY]?: CitiesCache };
const cache: CitiesCache = (globalScope[CACHE_KEY] ??= {
	inFlight: null,
});

/** Свежий список или null: null означает, что нужен новый запрос. */
export const readFreshCities = (): ChatCity[] | null => {
	if (CACHE_TTL_MS <= 0) return null;
	const entry = readSwrEntry<ChatCity[]>(SWR_CITIES_KEY);
	if (!entry || !entry.data) return null;
	return Date.now() - entry.storedAt < CACHE_TTL_MS ? entry.data : null;
};

/** Последний успешный список независимо от свежести: используется при ошибке Directus. */
export const readStaleCities = (): ChatCity[] | null => {
	const entry = readSwrEntry<ChatCity[]>(SWR_CITIES_KEY);
	return entry ? entry.data : null;
};

export const storeCities = (cities: ChatCity[]): void => {
	writeSwrEntry(SWR_CITIES_KEY, cities);
};

export const readInFlight = (): Promise<ChatCity[]> | null => cache.inFlight;

/** Запоминает запрос, чтобы параллельные рендеры не создавали свой, и снимает его по завершении. */
export const trackInFlight = (request: Promise<ChatCity[]>): Promise<ChatCity[]> => {
	cache.inFlight = request.finally(() => {
		cache.inFlight = null;
	});
	return cache.inFlight;
};
