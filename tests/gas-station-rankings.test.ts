import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
	buildCityStationRanking,
	rankingKindBySlug,
} from '../src/features/gas-station-rankings/index.ts';
import type { StationPricesSnapshot } from '../src/features/gas-stations/index.ts';
import { buildCityUrl } from '../src/lib/cities/routes.ts';
import type { StationData } from '../src/lib/gasStations.ts';

const NOW = Date.parse('2026-08-18T12:00:00.000Z');
const CURRENT = '2026-08-18T11:30:00.000Z';
const PREVIOUS = '2026-08-18T11:00:00.000Z';

const station = (
	id: string,
	options: { address?: string; closed?: boolean; name?: string } = {},
): StationData => ({
	station: {
		id,
		region_id: 0,
		name: options.name ?? `АЗС ${id}`,
		brand: `brand-${id}`,
		address: options.address ?? `ул. Тестовая, ${id}`,
		lat: 57,
		lng: 65,
		last_transaction_at: CURRENT,
		has_shop: false,
		has_cafe: false,
		has_toilet: false,
		has_car_wash: false,
		pay_card: false,
		pay_cash: false,
		pay_sbp: false,
		fuel_assortment: [],
	},
	fuel_statuses: [],
	prices: [],
	status: options.closed ? 'closed' : 'open',
	closed: options.closed ?? false,
	queue_level: 'NONE',
});

const snapshot = (
	stationId: string,
	snapshotDate: string,
	prices: Partial<Record<'AI_92' | 'AI_95' | 'AI_100' | 'DT', number>>,
	updatedAt = snapshotDate,
): StationPricesSnapshot => ({
	stationId,
	snapshotDate,
	brandSlug: `brand-${stationId}`,
	prices: Object.entries(prices).map(([fuelType, price]) => ({
		station_id: stationId,
		fuel_type: fuelType,
		price,
		updated_at: updatedAt,
	})),
});

const buildFixture = (kind: 'cheapest' | 'expensive') => {
	const cards = new Map<string, StationData>();
	const snapshots: StationPricesSnapshot[] = [];
	for (let index = 1; index <= 7; index += 1) {
		const id = String(index);
		cards.set(id, station(id));
		snapshots.push(
			snapshot(id, PREVIOUS, { AI_92: 50 + index, AI_95: 60 + index, DT: 70 + index }),
			snapshot(id, CURRENT, {
				AI_92: 51 + index,
				AI_95: 59 + index,
				AI_100: 80 + index,
				DT: 70 + index,
			}),
		);
	}
	return buildCityStationRanking('tyumen', kind, snapshots, cards, NOW);
};

test('строит топ-5 отдельно по каждому виду топлива', () => {
	const data = buildFixture('cheapest');
	const ai92 = data.sections.find((section) => section.fuelType === 'AI_92');
	const dt = data.sections.find((section) => section.fuelType === 'DT');

	assert.deepEqual(ai92?.stations.map((item) => item.id), ['1', '2', '3', '4', '5']);
	assert.deepEqual(dt?.stations.map((item) => item.rank), [1, 2, 3, 4, 5]);
	assert.equal(data.totalStations, 7);
	assert.equal(data.isIndexable, true);
});

test('дорогой рейтинг сортируется в обратном порядке', () => {
	const data = buildFixture('expensive');
	const ai95 = data.sections.find((section) => section.fuelType === 'AI_95');
	assert.deepEqual(ai95?.stations.map((item) => item.id), ['7', '6', '5', '4', '3']);
});

test('считает динамику относительно предыдущего получасового снимка', () => {
	const data = buildFixture('cheapest');
	const first = data.sections.find((section) => section.fuelType === 'AI_92')?.stations[0];
	const ai92 = first?.prices.find((price) => price.fuelType === 'AI_92');
	const ai95 = first?.prices.find((price) => price.fuelType === 'AI_95');
	const ai100 = first?.prices.find((price) => price.fuelType === 'AI_100');

	assert.equal(ai92?.delta, 1);
	assert.equal(ai92?.trend, 'up');
	assert.equal(ai95?.delta, -1);
	assert.equal(ai95?.trend, 'down');
	assert.equal(ai100?.delta, null);
	assert.equal(ai100?.trend, 'unknown');
});

test('исключает закрытые, безадресные и устаревшие АЗС', () => {
	const cards = new Map([
		['closed', station('closed', { closed: true })],
		['addressless', station('addressless', { address: '' })],
		['stale', station('stale')],
		['fresh', station('fresh')],
	]);
	const staleUpdatedAt = new Date(NOW - 48 * 60 * 60 * 1000).toISOString();
	const snapshots = [
		snapshot('closed', CURRENT, { AI_92: 50 }),
		snapshot('addressless', CURRENT, { AI_92: 51 }),
		snapshot('stale', CURRENT, { AI_92: 52 }, staleUpdatedAt),
		snapshot('fresh', CURRENT, { AI_92: 53 }),
	];
	const data = buildCityStationRanking('tyumen', 'cheapest', snapshots, cards, NOW);
	const ai92 = data.sections.find((section) => section.fuelType === 'AI_92');

	assert.deepEqual(ai92?.stations.map((item) => item.id), ['fresh']);
	assert.equal(data.isIndexable, false);
});

test('azs всегда использует городской префикс, а slug имеет строгий allowlist', () => {
	assert.equal(buildCityUrl('/azs/deshevye-zapravki', 'tyumen', 'tyumen'), '/tyumen/azs/deshevye-zapravki');
	assert.equal(buildCityUrl('/azs/dorogie-zapravki', 'irkutsk', 'tyumen'), '/irkutsk/azs/dorogie-zapravki');
	assert.equal(rankingKindBySlug('deshevye-zapravki'), 'cheapest');
	assert.equal(rankingKindBySlug('dorogie-zapravki'), 'expensive');
	assert.equal(rankingKindBySlug('unknown'), null);
});

test('страницы используют шаблонные карточки и LightChat только в городском рейтинге', async () => {
	const [hub, ranking, catalog, card, content, alias, cityRoute, astroConfig, sitemap] = await Promise.all([
		readFile('src/components/pages/AzsHubPage.astro', 'utf8'),
		readFile('src/components/pages/AzsRankingPage.astro', 'utf8'),
		readFile('src/components/azs/AzsCityCatalog.astro', 'utf8'),
		readFile('src/components/azs/AzsRankingCard.astro', 'utf8'),
		readFile('src/data/azsAnalyticsContent.ts', 'utf8'),
		readFile('src/pages/azs/[ranking].astro', 'utf8'),
		readFile('src/pages/[city]/azs/[ranking].astro', 'utf8'),
		readFile('astro.config.mjs', 'utf8'),
		readFile('src/lib/sitemap/cityUrls.ts', 'utf8'),
	]);

	assert.match(hub, /AzsCityCatalog/);
	assert.doesNotMatch(hub, /LightChatBox/);
	assert.match(ranking, /AzsRankingSection/);
	assert.match(ranking, /LightChatBox/);
	assert.match(catalog, /class="page-services"/);
	assert.match(catalog, /class="service-item/);
	assert.match(card, /class="pricing-item/);
	assert.match(content, /Где дешёвый бензин[\s\S]*АЗС АИ-92, АИ-95, АИ-100, ДТ/);
	assert.match(content, /Где дорогой бензин[\s\S]*АЗС АИ-92, АИ-95, АИ-100, ДТ/);
	assert.match(alias, /Astro\.redirect[\s\S]*301/);
	assert.match(alias, /Astro\.url\.search/);
	assert.match(cityRoute, /status: 404/);
	assert.match(astroConfig, /getGasStationRankingSitemapUrls/);
	assert.match(sitemap, /absolute\(site, '\/azs'\)/);
});
