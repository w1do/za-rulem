import { defineMiddleware } from 'astro:middleware';
import { defaultCity } from './lib/cities';

const ROOT_MIRRORED_SECTIONS = new Set([
	'about',
	'calculator',
	'ceny-na-benzin',
	'chat',
	'contacts',
	'drivers',
	'partners',
	'privacy-policy',
	'queue',
	'services',
	'terms',
	'testimonials',
]);

export const onRequest = defineMiddleware(({ redirect, url }, next) => {
	const cityPrefix = `/${defaultCity.slug}`;
	if (url.pathname !== cityPrefix && !url.pathname.startsWith(`${cityPrefix}/`)) {
		return next();
	}

	const rootPath = url.pathname.slice(cityPrefix.length) || '/';
	const [section] = rootPath.split('/').filter(Boolean);
	if (rootPath !== '/' && (!section || !ROOT_MIRRORED_SECTIONS.has(section))) {
		return next();
	}

	return redirect(`${rootPath}${url.search}`, 301);
});
