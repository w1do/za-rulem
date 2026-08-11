// Городские страницы отдаются по запросу (prerender = false), поэтому Astro
// не видит их при сборке. Список собирается здесь и передаётся в @astrojs/sitemap
// как customPages, чтобы карта городов генерировалась той же интеграцией.

import { chatFuels } from '../../data/chatCluster';
import { cities, cityLandingUrl, defaultCity, fuelLandingUrl } from '../../lib/cities';

/** Маршруты города, кроме служебных: чат-приложение и юридические страницы дублируют корень. */
const CITY_PATHS = [
	'',
	'/ceny-na-benzin',
	'/queue',
	'/drivers',
	'/calculator',
	'/services'
];

const citySlugs: ReadonlySet<string> = new Set(cities.map((city) => city.slug));

const absolute = (site: string, path: string): string => new URL(path, site).href;

/** Полные URL всех индексируемых городских страниц для sitemap. */
export const getCitySitemapUrls = (site: string): string[] =>
	cities
		.filter((city) => city.isIndexable !== false)
		.flatMap((city) => [
			...(city.slug === defaultCity.slug
				? []
				: CITY_PATHS.map((path) => absolute(site, `/${city.slug}${path}`))),
			absolute(site, cityLandingUrl(city.slug)),
			...chatFuels.map((fuel) => absolute(site, fuelLandingUrl(city.slug, fuel.slug))),
		]);

/** Признак городского URL: первый сегмент пути совпадает со слагом города. */
export const isCitySitemapUrl = (url: string): boolean => {
	try {
		const [firstSegment] = new URL(url).pathname.split('/').filter(Boolean);
		return firstSegment !== undefined && citySlugs.has(firstSegment);
	} catch {
		return false;
	}
};
