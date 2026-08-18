// Городские страницы отдаются по запросу (prerender = false), поэтому Astro
// не видит их при сборке. Список собирается здесь и передаётся в @astrojs/sitemap
// как customPages, чтобы карта городов генерировалась той же интеграцией.

import { readdir } from 'node:fs/promises';
import { chatFuels } from '../../data/chatCluster';
import { cities, cityLandingUrl, defaultCity, fuelLandingUrl } from '../../lib/cities';

/** Локальные маршруты, у которых базовый город по-прежнему живёт в корне. */
const CITY_PATHS = [
	'',
	'/ceny-na-benzin',
	'/ochered-na-azs',
	'/queue',
	'/avtopomoshch',
	'/drivers',
	'/calculator',
	'/partners',
];

const servicesContentDirectory = new URL('../../content/services/', import.meta.url);

/** URL услуг выводятся из Content Collections, чтобы новые hubs/spokes попадали в sitemap автоматически. */
const getServicePaths = async (): Promise<string[]> => {
	const clusters = (await readdir(servicesContentDirectory, { withFileTypes: true }))
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
		.sort();
	const paths = ['/services'];

	for (const cluster of clusters) {
		const files = await readdir(new URL(`./${cluster}/`, servicesContentDirectory), {
			withFileTypes: true,
		});
		if (files.some((entry) => entry.isFile() && entry.name === 'index.md')) {
			paths.push(`/services/${cluster}`);
		}
		paths.push(
			...files
				.filter((entry) => entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'index.md')
				.map((entry) => `/services/${cluster}/${entry.name.slice(0, -3)}`)
				.sort(),
		);
	}

	return paths;
};

const citySlugs: ReadonlySet<string> = new Set(cities.map((city) => city.slug));

const absolute = (site: string, path: string): string => new URL(path, site).href;

/** Полные URL всех индексируемых городских страниц для sitemap. */
export const getCitySitemapUrls = async (site: string): Promise<string[]> => {
	const servicePaths = await getServicePaths();

	return [
		absolute(site, '/chats'),
		absolute(site, '/azs'),
		absolute(site, '/ceny-na-benzin'),
		absolute(site, '/ochered-na-azs'),
		...cities
			.filter((city) => city.isIndexable !== false)
			.flatMap((city) => [
				...(city.slug === defaultCity.slug
					? []
					: CITY_PATHS.map((path) => absolute(site, `/${city.slug}${path}`))),
				...servicePaths.map((path) => absolute(site, `/${city.slug}${path}`)),
				absolute(site, cityLandingUrl(city.slug)),
				...chatFuels.map((fuel) => absolute(site, fuelLandingUrl(city.slug, fuel.slug))),
			]),
	];
};

/** Признак городского URL: первый сегмент пути совпадает со слагом города. */
export const isCitySitemapUrl = (url: string): boolean => {
	try {
		const [firstSegment] = new URL(url).pathname.split('/').filter(Boolean);
		return firstSegment !== undefined && citySlugs.has(firstSegment);
	} catch {
		return false;
	}
};
