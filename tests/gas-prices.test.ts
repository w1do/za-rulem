import assert from 'node:assert/strict';
import test from 'node:test';
import {
	addPriceTrends,
	aggregateFuelPrices,
	buildBrandSummaries,
	createGasPriceSnapshots,
	getSnapshotDate,
	groupStationsByBrand,
	isBrandReadyForIndexing,
	normalizeBrandName,
} from '../src/features/gas-prices/model/aggregate.ts';
import type { GasBrand, GasPriceSnapshot } from '../src/features/gas-prices/model/types.ts';
import type { StationData } from '../src/lib/gasStations.ts';

const NOW = new Date('2026-08-12T12:00:00.000Z');

const station = (
	id: string,
	brand: string,
	prices: Array<{ fuel_type: string; price: number; updated_at?: string }>,
	timezoneOffset = 5,
): StationData => ({
	station: {
		id,
		region_id: 1,
		name: `${brand}, АЗС`,
		brand,
		address: `Улица ${id}`,
		lat: 57.1,
		lng: 65.5,
		last_transaction_at: NOW.toISOString(),
		timezone_offset: timezoneOffset,
		has_shop: false,
		has_cafe: false,
		has_toilet: false,
		has_car_wash: false,
		pay_card: true,
		pay_cash: true,
		pay_sbp: false,
		fuel_assortment: prices.map((price) => price.fuel_type),
	},
	fuel_statuses: [],
	prices: prices.map((price) => ({ station_id: id, updated_at: NOW.toISOString(), ...price })),
	status: 'OPEN',
	closed: false,
	queue_level: 'NONE',
});

const verifiedBrand: GasBrand = {
	slug: 'test',
	name: 'Тест',
	aliases: ['Тест'],
	isIndexable: true,
	verificationStatus: 'verified',
};

test('brand normalization removes descriptors but preserves exact network names', () => {
	assert.equal(normalizeBrandName('«Кондор», АЗС'), 'кондор');
	const groups = groupStationsByBrand([
		station('1', 'Газпром', []),
		station('2', 'Газпромнефть', []),
	]);
	assert.equal(groups.length, 2);
	assert.notEqual(groups[0]?.brand.slug, groups[1]?.brand.slug);
});

test('current fuel prices are aggregated as average, min and max', () => {
	const prices = aggregateFuelPrices([
		station('1', 'Тест', [{ fuel_type: 'AI_95', price: 60 }]),
		station('2', 'Тест', [{ fuel_type: 'AI_95', price: 64 }]),
	], NOW.getTime());
	assert.deepEqual(prices[0], {
		fuelType: 'AI_95',
		average: 62,
		min: 60,
		max: 64,
		sampleCount: 2,
		updatedAt: NOW.toISOString(),
	});
});

test('prices older than seven days are excluded without fake fallback', () => {
	const prices = aggregateFuelPrices([
		station('1', 'Тест', [{
			fuel_type: 'AI_92',
			price: 55,
			updated_at: '2026-08-01T00:00:00.000Z',
		}]),
	], NOW.getTime());
	assert.deepEqual(prices, []);
});

test('cards include networks even when fresh prices are absent', () => {
	const summaries = buildBrandSummaries('tyumen', [station('1', 'Без цены', [])], [], [], NOW);
	assert.equal(summaries.length, 1);
	assert.equal(summaries[0]?.stationCount, 1);
	assert.deepEqual(summaries[0]?.fuels, []);
});

test('delta is calculated against the previous half-hour snapshot in rubles', () => {
	const previous: GasPriceSnapshot = {
		citySlug: 'tyumen', brandSlug: 'test', snapshotDate: '2026-08-12T16:00:00',
		stationCount: 1, sourceUpdatedAt: NOW.toISOString(),
		fuels: [{ fuelType: 'AI_95', average: 60, min: 60, max: 60, sampleCount: 1, updatedAt: NOW.toISOString() }],
	};
	const [current] = addPriceTrends(
		[{ fuelType: 'AI_95', average: 61.35, min: 61.35, max: 61.35, sampleCount: 1, updatedAt: NOW.toISOString() }],
		previous,
	);
	assert.equal(current?.delta, 1.35);
	assert.equal(current?.trend, 'up');
});

test('snapshot datetime uses station timezone and rounds down to a half-hour key', () => {
	const stations = [station('1', 'Тест', [{ fuel_type: 'DT', price: 70 }], 5)];
	const currentTime = new Date('2026-08-12T21:47:25.000Z');
	assert.equal(getSnapshotDate(stations, currentTime), '2026-08-13T02:30:00');
	const first = createGasPriceSnapshots('tyumen', stations, [verifiedBrand], currentTime)[0];
	const second = createGasPriceSnapshots('tyumen', stations, [verifiedBrand], currentTime)[0];
	assert.equal(
		`${first?.snapshot.citySlug}:${first?.snapshot.brandSlug}:${first?.snapshot.snapshotDate}`,
		`${second?.snapshot.citySlug}:${second?.snapshot.brandSlug}:${second?.snapshot.snapshotDate}`,
	);
});

test('SEO readiness requires a verified brand, fresh source and two distinct snapshots', () => {
	const summary = buildBrandSummaries(
		'tyumen',
		[station('1', 'Тест', [{ fuel_type: 'AI_92', price: 59 }])],
		[],
		[verifiedBrand],
		NOW,
	)[0];
	assert.ok(summary);
	const history: GasPriceSnapshot[] = ['2026-08-12T16:00:00', '2026-08-12T16:30:00'].map((snapshotDate) => ({
		citySlug: 'tyumen', brandSlug: 'test', snapshotDate, stationCount: 1,
		sourceUpdatedAt: NOW.toISOString(), fuels: [],
	}));
	assert.equal(isBrandReadyForIndexing(summary, history, NOW.getTime()), true);
	assert.equal(isBrandReadyForIndexing(summary, history.slice(0, 1), NOW.getTime()), false);
});
