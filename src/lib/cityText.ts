// Работа с плейсхолдерами города вынесена отдельно от src/lib/city.ts:
// туда тянется справочник городов (серверный модуль с process.env), а эти
// функции нужны в том числе в коде, который попадает в клиентский бандл.
import type { ChatCity } from './cities/types';

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
 * Локализует абсолютные ссылки на услуги внутри доверенного HTML из Content Collections.
 * Остальные URL, текст и атрибуты не изменяются.
 */
export const localizeCityServiceLinks = (html: string, citySlug: string): string => {
	if (!html || !citySlug) return html;

	return html.replace(
		/href=(["'])\/services(?=\/|[?#]|\1)/g,
		`href=$1/${citySlug}/services`,
	);
};
