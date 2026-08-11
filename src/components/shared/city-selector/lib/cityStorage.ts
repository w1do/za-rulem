import type { ChatCity } from '../../../../lib/cities';

/** Ключи и событие — единый клиентский контракт города. */
export const CITY_STORAGE_KEY = 'za-rulem-city';
const DEFAULT_CITY_STORAGE_KEY = 'default_city';
export const CITY_CHANGE_EVENT = 'city-change';

export const readCity = (): string | null => {
	try {
		return window.localStorage.getItem(CITY_STORAGE_KEY);
	} catch {
		return null;
	}
};

const saveDefaultCity = (city: ChatCity): void => {
	try {
		const serializedCity = JSON.stringify(city);
		if (window.localStorage.getItem(DEFAULT_CITY_STORAGE_KEY) !== serializedCity) {
			window.localStorage.setItem(DEFAULT_CITY_STORAGE_KEY, serializedCity);
		}
	} catch {
		// Приватный режим — работаем без сохранения.
	}
};

/** Сохраняет город и сообщает о смене остальным компонентам страницы. */
export const saveCity = (slug: string): void => {
	if (!slug || readCity() === slug) return;
	try {
		window.localStorage.setItem(CITY_STORAGE_KEY, slug);
	} catch {
		// Приватный режим — работаем без сохранения, событие всё равно нужно.
	}
	window.dispatchEvent(new CustomEvent(CITY_CHANGE_EVENT, { detail: slug }));
};

/** URL всегда главный: `/` передаёт default, `/{city}` — явный город. */
export const syncCityContext = (currentCitySlug: string, defaultCity: ChatCity): void => {
	saveDefaultCity(defaultCity);
	saveCity(currentCitySlug);
};
