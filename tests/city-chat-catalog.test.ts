import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
	buildCityChatCatalogCard,
	CITY_CHAT_CATALOG_LIMIT,
	CITY_CHAT_SEARCH_RESULT_LIMIT,
	searchCityChatOptions,
	selectCityChatCatalog,
	sortCityChatCatalog,
} from '../src/components/driver-chat/catalog/model.ts';
import type { GasBrandSummary, FuelPriceView } from '../src/features/gas-prices/model/types.ts';
import type { ChatCity } from '../src/lib/cities/types.ts';

const NOW = new Date('2026-08-18T12:00:00.000Z');

const city = (slug: string, name: string): ChatCity => ({
	slug,
	name,
	inCity: `в ${name}`,
	ofCity: name,
	byCity: `по ${name}`,
	forCity: `для ${name}`,
	hint: `Чат города ${name}`,
	region: 'Тестовая область',
	population: 100_000,
	isFeatured: false,
	isDefault: slug === 'first',
	isIndexable: true,
	seoTitle: '',
	seoDescription: '',
	bounds: { minLat: 50, maxLat: 51, minLon: 60, maxLon: 61 },
});

const fuel = (
	fuelType: string,
	average: number,
	sampleCount: number,
	previousAverage: number | null,
	updatedAt = NOW.toISOString(),
): FuelPriceView => ({
	fuelType,
	average,
	min: average,
	max: average,
	sampleCount,
	updatedAt,
	previousAverage,
	delta: previousAverage === null ? null : average - previousAverage,
	trend: previousAverage === null ? 'unknown' : average > previousAverage ? 'up' : 'stable',
});

const summary = (brandSlug: string, fuels: FuelPriceView[], stationCount = 4): GasBrandSummary => ({
	brand: {
		slug: brandSlug,
		name: brandSlug,
		aliases: [],
		isIndexable: true,
		verificationStatus: 'verified',
	},
	stationCount,
	sourceUpdatedAt: NOW.toISOString(),
	snapshotDate: NOW.toISOString(),
	fuels,
	history: [],
});

test('catalog card requires broad fresh coverage and calculates weighted prices', () => {
	const card = buildCityChatCatalogCard(
		city('first', 'Первый'),
		[
			summary('a', [
				fuel('AI_92', 60, 2, 59),
				fuel('AI_95', 64, 2, 63),
				fuel('DT', 72, 1, 72),
			]),
			summary('b', [
				fuel('AI_92', 63, 3, 62),
				fuel('AI_95', 67, 3, 66),
				fuel('DT', 74, 2, 73),
			]),
		],
		NOW.getTime(),
	);

	assert.ok(card);
	assert.equal(card.stationCount, 8);
	assert.equal(card.fuels.find((item) => item.fuelType === 'AI_92')?.average, 61.8);
	assert.equal(card.fuels.find((item) => item.fuelType === 'AI_92')?.delta, 1);
	assert.equal(card.fuels.find((item) => item.fuelType === 'AI_100')?.average, null);
});

test('stale or narrow observations do not create a city card', () => {
	const staleAt = '2026-08-16T11:59:00.000Z';
	const stale = buildCityChatCatalogCard(
		city('stale', 'Старый'),
		[summary('a', [
			fuel('AI_92', 60, 5, 59, staleAt),
			fuel('AI_95', 64, 5, 63, staleAt),
			fuel('DT', 72, 5, 71, staleAt),
		])],
		NOW.getTime(),
	);
	const narrow = buildCityChatCatalogCard(
		city('narrow', 'Узкий'),
		[summary('a', [
			fuel('AI_92', 60, 5, 59),
			fuel('AI_95', 64, 2, 63),
			fuel('DT', 72, 5, 71),
		])],
		NOW.getTime(),
	);

	assert.equal(stale, null);
	assert.equal(narrow, null);
});

test('catalog sort prioritizes core coverage and then total observations', () => {
	const first = buildCityChatCatalogCard(
		city('first', 'Первый'),
		[summary('a', [fuel('AI_92', 60, 4, 59), fuel('AI_95', 64, 4, 63), fuel('DT', 72, 2, 71)])],
		NOW.getTime(),
	);
	const second = buildCityChatCatalogCard(
		city('second', 'Второй'),
		[summary('b', [fuel('AI_92', 61, 6, 60), fuel('AI_95', 65, 5, 64), fuel('DT', 73, 2, 72)])],
		NOW.getTime(),
	);

	assert.ok(first && second);
	assert.deepEqual(sortCityChatCatalog([first, second]).map((card) => card.city.slug), ['second', 'first']);
});

test('catalog limits the rendered list after ranking', () => {
	const cards = Array.from({ length: CITY_CHAT_CATALOG_LIMIT + 6 }, (_, index) =>
		buildCityChatCatalogCard(
			city(`city-${index}`, `Город ${index}`),
			[summary(`brand-${index}`, [
				fuel('AI_92', 60, index + 3, 59),
				fuel('AI_95', 64, index + 3, 63),
				fuel('DT', 72, 2, 71),
			])],
			NOW.getTime(),
		),
	).filter((card): card is NonNullable<typeof card> => card !== null);

	const selected = selectCityChatCatalog(cards);
	assert.equal(selected.length, CITY_CHAT_CATALOG_LIMIT);
	assert.equal(selected[0]?.city.slug, `city-${CITY_CHAT_CATALOG_LIMIT + 5}`);
});

test('catalog renders ten recommendations and searches the complete city directory', () => {
	assert.equal(CITY_CHAT_CATALOG_LIMIT, 10);
	assert.equal(CITY_CHAT_SEARCH_RESULT_LIMIT, 10);

	const options = [
		{ slug: 'orel', name: 'Орёл', region: 'Орловская область', hint: 'Чат Орла' },
		{ slug: 'irkutsk', name: 'Иркутск', region: 'Иркутская область', hint: 'Чат Иркутска' },
		{ slug: 'angarsk', name: 'Ангарск', region: 'Иркутская область', hint: 'Чат Ангарска' },
	];

	assert.deepEqual(searchCityChatOptions(options, 'орел').map((item) => item.slug), ['orel']);
	assert.deepEqual(
		searchCityChatOptions(options, 'иркутская').map((item) => item.slug),
		['angarsk', 'irkutsk'],
	);
	assert.deepEqual(searchCityChatOptions(options, 'неизвестный'), []);
});

test('message preview requests only non-personal fields', async () => {
	const source = await readFile('src/components/driver-chat/catalog/api.ts', 'utf8');
	assert.match(source, /fields: 'id,text,topic,date_created'/);
	assert.doesNotMatch(source, /fields: '[^']*phone/);
	assert.doesNotMatch(source, /fields: '[^']*sessionId/);
});

test('catalog reads recent gas data in one cross-city request', async () => {
	const catalogSource = await readFile('src/components/driver-chat/catalog/server.ts', 'utf8');
	const gasSource = await readFile('src/features/gas-prices/api/directusGasPrices.ts', 'utf8');
	assert.match(catalogSource, /loadRecentCityBrandSummaries/);
	assert.doesNotMatch(catalogSource, /getGasCityPrices/);
	assert.match(catalogSource, /selectCityChatCatalog/);
	assert.match(catalogSource, /24 \* 60 \* 60 \* 1000/);
	assert.match(catalogSource, /__zaRulemCityChatCatalog/);
	assert.match(catalogSource, /listCityChatSearchOptions/);
	assert.match(gasSource, /filter\[area_type\]\[_eq\].*'city'/s);
	assert.match(gasSource, /filter\[snapshot_date\]\[_gte\]/);
});
