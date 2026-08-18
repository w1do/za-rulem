import { CACHE_TTL_MS, DIRECTUS_URL, REQUEST_TIMEOUT_MS } from './config.ts';
import { CITY_FIELDS, toCity, type CityDto } from './dto.ts';
import type { ChatCity } from './types.ts';
import { getOrFetchSwr, safeFetchWithTimeout } from '../../shared/lib/cache/fileSwrCache.ts';

const SWR_CITIES_KEY = 'cities:published';

export const FALLBACK_CITIES: ChatCity[] = [
	{
		slug: 'tyumen',
		name: 'Тюмень',
		ofCity: 'Тюмени',
		inCity: 'в Тюмени',
		toCity: 'в Тюмень',
		fromCity: 'из Тюмени',
		region: 'Тюменская область',
		hint: 'Тюменская область',
		population: 861000,
		isFeatured: true,
		isDefault: true,
		isIndexable: true,
		seoTitle: 'Чат водителей Тюмени: цены на бензин и очереди на АЗС — Тюменская область',
		seoDescription:
			'Живой чат водителей Тюмени (Тюменская область, Уральский федеральный округ): где сейчас есть бензин и дизель, актуальные цены на топливо и очереди на АЗС Тюмени в реальном времени.',
	},
];

const citiesUrl = (): string =>
	`${DIRECTUS_URL}/items/cities?limit=-1&fields=${CITY_FIELDS}&sort=sort,name&filter[status][_eq]=published`;

/** Запрос к источнику городов — Directus. */
const requestCities = async (): Promise<ChatCity[]> => {
	const response = await safeFetchWithTimeout(citiesUrl(), undefined, REQUEST_TIMEOUT_MS);
	if (!response.ok) throw new Error(`Directus ответил ${response.status}`);

	const payload = (await response.json()) as { data?: unknown };
	const items = Array.isArray(payload.data) ? (payload.data as CityDto[]) : [];
	const cities = items.map(toCity).filter((city): city is ChatCity => city !== null);

	if (cities.length === 0) throw new Error('Directus вернул пустой список городов');

	// Избранные города идут первыми: они показываются в меню и подборках.
	return [...cities].sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured));
};

/**
 * Читает опубликованные города из Directus через персистентный SWR-кеш.
 * Мгновенно возвращает данные из памяти или диска, при устаревании фоново опрашивает Directus.
 */
export const fetchCities = async (): Promise<ChatCity[]> => {
	return getOrFetchSwr<ChatCity[]>({
		key: SWR_CITIES_KEY,
		ttlMs: CACHE_TTL_MS,
		staleTtlMs: 30 * 24 * 60 * 60 * 1000, // 30 дней
		fetcher: requestCities,
		fallback: FALLBACK_CITIES,
	});
};
