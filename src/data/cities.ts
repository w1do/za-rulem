import { fetchCities, type ChatCity } from '../lib/cities';

export type { ChatCity };

export { DEFAULT_CITY_SLUG } from '../lib/cities/default';

/**
 * Полный справочник городов чата: источник истины — коллекция `cities` Directus.
 * Загружается один раз на процесс (сборка или SSR-сервер); чтобы применить правки
 * в Directus, достаточно перезапустить сервер.
 */
export const chatCities: ChatCity[] = await fetchCities();

/** Ссылка на посадочную топлива: теперь все города имеют одинаковую структуру URL. */
export const fuelLandingUrl = (citySlug: string, fuelSlug: string) =>
	`/${citySlug}/chat-voditeley/${fuelSlug}`;

/** Ссылка на страницу города. */
export const cityLandingUrl = (citySlug: string) =>
	`/${citySlug}/chat-voditeley`;

/** Ссылка на приложение-чат с предвыбранным городом и каналом. */
export const chatAppUrl = (citySlug: string, fuelSlug?: string) => {
	const params = new URLSearchParams({ city: citySlug });
	if (fuelSlug) params.set('topic', fuelSlug);
	return `/chat?${params.toString()}`;
};

/** Город по слагу из URL или undefined: маршрут в этом случае отдаёт 404. */
export const findCity = (slug?: string): ChatCity | undefined =>
	slug ? chatCities.find((city) => city.slug === slug) : undefined;
