import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { localizeCityServiceLinks } from '../src/lib/cityText.ts';
import {
	buildCityUrl,
	isCityPrefixRequiredRoute,
} from '../src/lib/cities/routes.ts';

test('услуги всегда получают городской префикс', () => {
	assert.equal(isCityPrefixRequiredRoute('/services'), true);
	assert.equal(isCityPrefixRequiredRoute('/services/tehpomosch/prikurit-avto'), true);
	assert.equal(buildCityUrl('/services', 'tyumen', 'tyumen'), '/tyumen/services');
	assert.equal(
		buildCityUrl('/services/tehpomosch/prikurit-avto', 'tyumen', 'tyumen'),
		'/tyumen/services/tehpomosch/prikurit-avto',
	);
	assert.equal(
		buildCityUrl('/services/toplivo', 'irkutsk', 'tyumen'),
		'/irkutsk/services/toplivo',
	);
});

test('остальные правила базового и глобального URL не меняются', () => {
	assert.equal(buildCityUrl('/ceny-na-benzin', 'tyumen', 'tyumen'), '/ceny-na-benzin');
	assert.equal(buildCityUrl('/ceny-na-benzin', 'irkutsk', 'tyumen'), '/irkutsk/ceny-na-benzin');
	assert.equal(buildCityUrl('/contacts', 'irkutsk', 'tyumen'), '/contacts');
});

test('ссылки из Markdown локализуются только внутри раздела услуг', () => {
	const html = [
		'<a href="/services">Все услуги</a>',
		'<a href="/services/tehpomosch/prikurit-avto?from=hub">Прикурить</a>',
		"<a href='/services/toplivo#price'>Топливо</a>",
		'<a href="/services-old">Не менять</a>',
		'<a href="/contacts">Контакты</a>',
	].join('');

	assert.equal(
		localizeCityServiceLinks(html, 'tyumen'),
		[
			'<a href="/tyumen/services">Все услуги</a>',
			'<a href="/tyumen/services/tehpomosch/prikurit-avto?from=hub">Прикурить</a>',
			"<a href='/tyumen/services/toplivo#price'>Топливо</a>",
			'<a href="/services-old">Не менять</a>',
			'<a href="/contacts">Контакты</a>',
		].join(''),
	);
});

test('корневые service-роуты оставлены только как 301 с проверкой slug', async () => {
	const [indexSource, hubSource, spokeSource, middlewareSource] = await Promise.all([
		readFile('src/pages/services/index.astro', 'utf8'),
		readFile('src/pages/services/[cluster]/index.astro', 'utf8'),
		readFile('src/pages/services/[cluster]/[post].astro', 'utf8'),
		readFile('src/middleware.ts', 'utf8'),
	]);

	for (const source of [indexSource, hubSource, spokeSource]) {
		assert.match(source, /Astro\.redirect\([\s\S]*301/);
		assert.match(source, /Astro\.url\.search/);
	}
	assert.match(hubSource, /status: 404/);
	assert.match(spokeSource, /status: 404/);
	assert.doesNotMatch(middlewareSource, /^\s*'services',\s*$/m);
});

test('sitemap исключает корневые услуги и выводит городские пути из контента', async () => {
	const [configSource, sitemapSource] = await Promise.all([
		readFile('astro.config.mjs', 'utf8'),
		readFile('src/lib/sitemap/cityUrls.ts', 'utf8'),
	]);

	assert.match(configSource, /isRootServiceUrl/);
	assert.match(configSource, /!isRootServiceUrl/);
	assert.match(sitemapSource, /readdir\(servicesContentDirectory/);
	assert.match(sitemapSource, /servicePaths\.map/);
});
