import { CACHE_TTL_MS } from './config';
import type { ChatCity } from './types';

type CitiesCache = {
	/** Последний успешный ответ Directus. */
	cities: ChatCity[] | null;
	/** Момент записи `cities`, мс. */
	storedAt: number;
	/** Запрос в полёте: параллельные рендеры ждут его вместо своего запроса. */
	inFlight: Promise<ChatCity[]> | null;
};

// Кеш живёт на globalThis: при сборке модуль может попасть в несколько чанков,
// и каждый экземпляр модуля иначе делал бы собственный запрос в Directus.
const CACHE_KEY = '__zaRulemCitiesCache';
const globalScope = globalThis as typeof globalThis & { [CACHE_KEY]?: CitiesCache };
const cache: CitiesCache = (globalScope[CACHE_KEY] ??= {
	cities: null,
	storedAt: 0,
	inFlight: null,
});

/** Свежий список или null: null означает, что нужен новый запрос. */
export const readFreshCities = (): ChatCity[] | null => {
	if (cache.cities === null || CACHE_TTL_MS <= 0) return null;
	return Date.now() - cache.storedAt < CACHE_TTL_MS ? cache.cities : null;
};

/** Последний успешный список независимо от свежести: используется при ошибке Directus. */
export const readStaleCities = (): ChatCity[] | null => cache.cities;

export const storeCities = (cities: ChatCity[]): void => {
	cache.cities = cities;
	cache.storedAt = Date.now();
};

export const readInFlight = (): Promise<ChatCity[]> | null => cache.inFlight;

/** Запоминает запрос, чтобы параллельные рендеры не создавали свой, и снимает его по завершении. */
export const trackInFlight = (request: Promise<ChatCity[]>): Promise<ChatCity[]> => {
	cache.inFlight = request.finally(() => {
		cache.inFlight = null;
	});
	return cache.inFlight;
};
