import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
	isRootOnlyRoute,
	ROOT_ONLY_ROUTE_SEGMENTS,
} from '../src/lib/cities/routes.ts';

const rootOnlyTargets = {
	about: '/about',
	contacts: '/contacts',
	testimonials: '/testimonials',
	'privacy-policy': '/privacy-policy',
	terms: '/terms',
} as const;

test('глобальные страницы отделены от локальных городских разделов', () => {
	assert.deepEqual([...ROOT_ONLY_ROUTE_SEGMENTS].sort(), [
		'about',
		'chat',
		'chats',
		'contacts',
		'privacy-policy',
		'terms',
		'testimonials',
	]);

	for (const segment of ROOT_ONLY_ROUTE_SEGMENTS) {
		assert.equal(isRootOnlyRoute(`/${segment}`), true);
		assert.equal(isRootOnlyRoute(`${segment}?utm_source=yandex`), true);
	}

	assert.equal(isRootOnlyRoute('/services'), false);
	assert.equal(isRootOnlyRoute('/chat-voditeley'), false);
	assert.equal(isRootOnlyRoute('/contacts/archive'), false);
});

test('старые городские системные URL возвращают прямой 301 после проверки города', async () => {
	for (const [segment, target] of Object.entries(rootOnlyTargets)) {
		const source = await readFile(`src/pages/[city]/${segment}.astro`, 'utf8');
		assert.match(source, /findCity\(Astro\.params\.city\)/);
		assert.match(source, /status: 404/);
		assert.match(source, new RegExp(`Astro\\.redirect\\(\\\`${target}\\\$\\{Astro\\.url\\.search\\}\\\`, 301\\)`));
	}

	const chatSource = await readFile('src/pages/[city]/chat.astro', 'utf8');
	assert.match(chatSource, /searchParams\.set\('city', city\.slug\)/);
	assert.match(chatSource, /Astro\.redirect\(`\/chat\?\$\{searchParams\.toString\(\)\}`, 301\)/);
});

test('корневые страницы используют глобальный SEO-контекст', async () => {
	const pageSources = await Promise.all([
		'AboutPage',
		'ContactsPage',
		'TestimonialsPage',
		'PrivacyPolicyPage',
		'TermsPage',
		'ChatAppPage',
	].map((page) => readFile(`src/components/pages/${page}.astro`, 'utf8')));

	for (const source of pageSources) {
		assert.match(source, /isNational=\{true\}/);
		assert.doesNotMatch(source, /getCityUrl\('\/(?:about|contacts|testimonials|privacy-policy|terms|chat)'/);
	}
});

test('sitemap и URL-реестр не объявляют городские системные страницы', async () => {
	const [sitemapSource, urls, robots] = await Promise.all([
		readFile('src/lib/sitemap/cityUrls.ts', 'utf8'),
		readFile('urls-seo.txt', 'utf8'),
		readFile('public/robots.txt', 'utf8'),
	]);

	for (const segment of ROOT_ONLY_ROUTE_SEGMENTS) {
		if (segment === 'chats') continue;
		assert.doesNotMatch(sitemapSource, new RegExp(`['\"]\\/${segment}['\"]`));
	}
	assert.match(sitemapSource, /absolute\(site, '\/chats'\)/);

	assert.doesNotMatch(urls, /# \/\{city\}.*\/(?:about|contacts|testimonials|privacy-policy|terms|chat)(?:[,\s]|$)/);
	assert.match(robots, /Allow: \/chat\?city=/);
});
