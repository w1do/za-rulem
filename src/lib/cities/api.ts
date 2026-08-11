import { readFreshCities, readInFlight, readStaleCities, storeCities, trackInFlight } from './cache';
import { DIRECTUS_URL, REQUEST_TIMEOUT_MS } from './config';
import { CITY_FIELDS, toCity, type CityDto } from './dto';
import type { ChatCity } from './types';

const citiesUrl = (): string =>
	`${DIRECTUS_URL}/items/cities?limit=-1&fields=${CITY_FIELDS}&sort=sort,name&filter[status][_eq]=published`;

/** Запрос к единственному источнику городов — Directus. */
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
		const staleCities = readStaleCities();
		if (staleCities) {
			console.error(
				'[cities] Directus недоступен, используется последний успешный кеш:',
				error instanceof Error ? error.message : error,
			);
			return staleCities;
		}

		throw error;
	}
};

/**
 * Читает опубликованные города из Directus через кеш процесса.
 * Пока кеш свежий, запрос не выполняется. При ошибке допустим только предыдущий
 * успешный ответ Directus; без него ошибка передаётся вызывающему коду.
 */
export const fetchCities = async (): Promise<ChatCity[]> =>
	readFreshCities() ?? readInFlight() ?? trackInFlight(loadCities());
