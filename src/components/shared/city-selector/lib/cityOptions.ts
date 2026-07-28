import { chatCities, DEFAULT_CITY_SLUG, type ChatCity } from '../../../../data/cities';

export interface CityOption {
	city: ChatCity;
	/** Субъект РФ: помогает отличить одноимённые города и найти город по региону. */
	region: string;
	href: string;
	isActive: boolean;
}

/** Города по алфавиту со ссылкой на их главную: базовый город живёт в корне сайта. */
export const getCityOptions = (currentSlug?: string): CityOption[] =>
	[...chatCities]
		.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
		.map((city) => ({
			city,
			region: city.region,
			href: city.slug === DEFAULT_CITY_SLUG ? '/' : `/${city.slug}`,
			isActive: city.slug === currentSlug,
		}));
