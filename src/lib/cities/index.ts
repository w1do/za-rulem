import { fetchCities } from './api';
import type { ChatCity } from './types';

export type { ChatCity };
export { removeCityPlaceholders, replaceCityPlaceholders } from '../cityText';

/** Единственный публичный справочник городов, загруженный из Directus. */
export const cities: ChatCity[] = await fetchCities();

const defaultCities = cities.filter((city) => city.isDefault);
const [defaultCityCandidate] = defaultCities;
if (defaultCities.length !== 1 || !defaultCityCandidate) {
	throw new Error(
		`Directus cities: ожидался ровно один опубликованный город с is_default=true, найдено ${defaultCities.length}`,
	);
}

export const defaultCity: ChatCity = defaultCityCandidate;

/** Строгий поиск для URL: неизвестный slug должен приводить к 404. */
export const findCity = (slug?: string): ChatCity | undefined =>
	slug ? cities.find((city) => city.slug === slug) : undefined;

/** Базовый город живёт в корне, остальные — под /{city}. */
export const getCityUrl = (path: string, citySlug = defaultCity.slug): string => {
	const cleanPath = path.replace(/^\/+/, '');
	if (citySlug === defaultCity.slug) return `/${cleanPath}`;
	return cleanPath ? `/${citySlug}/${cleanPath}` : `/${citySlug}`;
};

export const fuelLandingUrl = (citySlug: string, fuelSlug: string): string =>
	`/${citySlug}/chat-voditeley/${fuelSlug}`;

export const cityLandingUrl = (citySlug: string): string =>
	`/${citySlug}/chat-voditeley`;

export const chatAppUrl = (citySlug: string, fuelSlug?: string): string => {
	const params = new URLSearchParams({ city: citySlug });
	if (fuelSlug) params.set('topic', fuelSlug);
	return `/chat?${params.toString()}`;
};
