import { fallbackCities } from '../../data/cities/fallback';
import { readFreshCities, readInFlight, readStaleCities, storeCities, trackInFlight } from './cache';
import { DIRECTUS_URL, REQUEST_TIMEOUT_MS } from './config';
import { CITY_FIELDS, toCity, type CityDto } from './dto';
import type { ChatCity } from './types';

const citiesUrl = (): string =>
	`${DIRECTUS_URL}/items/cities?limit=-1&fields=${CITY_FIELDS}&sort=sort,name&filter[status][_eq]=published`;

/** Запрос к Directus: бросает ошибку, решение о fallback принимает `fetchCities`. */
const requestCities = async (): Promise<ChatCity[]> => {
	const response = await fetch(citiesUrl(), { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
	if (!response.ok) throw new Error(`Directus ответил ${response.status}`);

	const payload = (await response.json()) as { data?: unknown };
	const items = Array.isArray(payload.data) ? (payload.data as CityDto[]) : [];
	const cities = items.map(toCity).filter((city): city is ChatCity => city !== null);

	if (cities.length === 0) throw new Error('Directus вернул пустой список городов');

	// Избранные города идут первыми: они показываются в меню и подборках.
	return [...cities].sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
};

const loadCities = async (): Promise<ChatCity[]> => {
	try {
		const cities = await requestCities();
		storeCities(cities);
		return cities;
	} catch (error) {
		console.error(
			'[cities] Directus недоступен, используется кеш или резервный список:',
			error instanceof Error ? error.message : error,
		);
		// Ошибку не кешируем как свежий результат, чтобы следующий рендер попробовал снова.
		return readStaleCities() ?? fallbackCities;
	}
};

/**
 * Читает опубликованные города из Directus через кеш процесса.
 * Пока кеш свежий, запрос не выполняется; при ошибке отдаётся предыдущий
 * успешный список, а если его нет — резервный, чтобы сайт не падал без бэкенда.
 */
export const fetchCities = async (): Promise<ChatCity[]> =>
	readFreshCities() ?? readInFlight() ?? trackInFlight(loadCities());
