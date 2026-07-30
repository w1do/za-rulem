import { chatCities, type ChatCity } from '../data/cities';
import { DEFAULT_CITY_SLUG } from './cities/default';

export { removeCityPlaceholders, replaceCityPlaceholders } from './cityText';

/**
 * Получает объект города по его слагу. 
 * Если слаг не передан или не найден, возвращает город по умолчанию (Тюмень).
 */
export const getCityBySlug = (slug?: string): ChatCity => {
	const city = chatCities.find((c) => c.slug === slug);
	if (city) return city;
	
	const defaultCity = chatCities.find((c) => c.slug === DEFAULT_CITY_SLUG);
	if (!defaultCity) {
		throw new Error(`Default city with slug "${DEFAULT_CITY_SLUG}" not found in chatCities`);
	}
	return defaultCity;
};

/**
 * Формирует URL с учетом текущего города.
 * Если город — Тюмень (дефолт), префикс не добавляется.
 */
export const getCityUrl = (path: string, citySlug?: string): string => {
	// Убираем лишние слэши в начале, чтобы не было двойных
	const cleanPath = path.startsWith('/') ? path.substring(1) : path;
	
	if (!citySlug || citySlug === DEFAULT_CITY_SLUG) {
		return `/${cleanPath}`;
	}
	
	if (cleanPath === '') {
		return `/${citySlug}`;
	}
	
	return `/${citySlug}/${cleanPath}`;
};

/**
 * Проверяет, является ли текущий слаг города допустимым.
 */
export const isValidCity = (slug: string): boolean => {
	return chatCities.some((c) => c.slug === slug);
};
