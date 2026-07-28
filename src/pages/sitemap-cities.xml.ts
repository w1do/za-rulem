import type { APIRoute } from 'astro';
import { chatCities, cityLandingUrl, fuelLandingUrl } from '../data/cities';
import { chatFuels } from '../data/chatCluster';

export const prerender = false;

const SITE = 'https://za-rulem.org';

/** Маршруты города, кроме служебных: чат-приложение и юридические страницы дублируют корень. */
const CITY_PATHS = ['', '/ceny-na-benzin', '/queue', '/drivers', '/calculator', '/about', '/contacts', '/services', '/testimonials', '/partners'];

const escape = (value: string): string => value.replace(/&/g, '&amp;');

/**
 * Карта городских страниц: они отдаются по запросу, поэтому в статический
 * sitemap-index не попадают. Города берутся из Directus (`is_indexable`).
 */
export const GET: APIRoute = () => {
	const urls = chatCities
		.filter((city) => city.isIndexable)
		.flatMap((city) => [
			...CITY_PATHS.map((path) => `${SITE}/${city.slug}${path}`),
			`${SITE}${cityLandingUrl(city.slug)}`,
			...chatFuels.map((fuel) => `${SITE}${fuelLandingUrl(city.slug, fuel.slug)}`),
		]);

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `\t<url><loc>${escape(url)}</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>`).join('\n')}
</urlset>
`;

	return new Response(body, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Cache-Control': 'public, max-age=3600',
		},
	});
};
