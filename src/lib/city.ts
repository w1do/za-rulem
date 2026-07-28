import { chatCities, type ChatCity, DEFAULT_CITY_SLUG } from '../data/cities';

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
 * Заменяет плейсхолдеры в тексте на соответствующие падежи города.
 * Поддерживает: {city}, {inCity}, {ofCity}, {byCity}, {forCity}.
 */
export const replaceCityPlaceholders = (text: string, city: ChatCity): string => {
	if (!text) return text;
	return text
		.replace(/{city}/g, city.name)
		.replace(/{inCity}/g, city.inCity)
		.replace(/{ofCity}/g, city.ofCity)
		.replace(/{byCity}/g, city.byCity)
		.replace(/{forCity}/g, city.forCity);
};

/**
 * Удаляет все плейсхолдеры города из текста.
 * Используется там, где контекст города и так понятен (например, в списках услуг на странице города).
 */
export const removeCityPlaceholders = (text: string): string => {
	if (!text) return text;
	return text
		.replace(/\s*{city}/g, '')
		.replace(/\s*{inCity}/g, '')
		.replace(/\s*{ofCity}/g, '')
		.replace(/\s*{byCity}/g, '')
		.replace(/\s*{forCity}/g, '')
		.trim();
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
	
	return `/${citySlug}/${cleanPath}`;
};

/**
 * Проверяет, является ли текущий слаг города допустимым.
 */
export const isValidCity = (slug: string): boolean => {
	return chatCities.some((c) => c.slug === slug);
};
