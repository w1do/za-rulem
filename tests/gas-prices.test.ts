import assert from 'node:assert/strict';
import test from 'node:test';
import {
	addPriceTrends,
	buildBrandSummaries,
	isBrandReadyForIndexing,
	isGasPriceHistoryReadyForIndexing,
	mergeBrandRegistry,
	resolveGasBrand,
	selectFreshFuels,
} from '../src/features/gas-prices/model/aggregate.ts';
import { toLatinBrandSlug } from '../src/features/gas-prices/model/brandSlug.ts';
import { toGasPriceSnapshot } from '../src/features/gas-prices/api/dto.ts';
import type { GasBrand, GasPriceSnapshot } from '../src/features/gas-prices/model/types.ts';

const NOW = new Date('2026-08-12T12:00:00.000Z');

const verifiedBrand: GasBrand = {
	slug: 'test',
	name: 'Тест',
	aliases: ['Тест'],
	isIndexable: true,
	verificationStatus: 'verified',
};

const snapshot = (
	snapshotDate: string,
	average: number,
	updatedAt = NOW.toISOString(),
	brandSlug = 'test',
): GasPriceSnapshot => ({
	areaType: 'city',
	areaSlug: 'tyumen',
	brandSlug,
	snapshotDate,
	stationCount: 3,
	sourceUpdatedAt: updatedAt,
	fuels: [{ fuelType: 'AI_95', average, min: average - 1, max: average + 1, sampleCount: 2, updatedAt }],
});

test('Directus payload is mapped to a snapshot and invalid rows are rejected', () => {
	const mapped = toGasPriceSnapshot({
		id: 7,
		city_slug: 'tyumen',
		brand_slug: 'test',
		snapshot_date: '2026-08-12T16:00:00',
		station_count: 4,
		source_updated_at: NOW.toISOString(),
		fuel_prices: [
			{ fuel_type: 'AI_95', average: 61.5, min: 61, max: 62, sample_count: 3, updated_at: NOW.toISOString() },
			{ fuel_type: 'AI_92', average: 0, updated_at: NOW.toISOString() },
		],
	});
	assert.equal(mapped?.stationCount, 4);
	assert.deepEqual(mapped?.fuels.map((fuel) => fuel.fuelType), ['AI_95']);
	assert.equal(toGasPriceSnapshot({ area_slug: 'tyumen' }), null);
});

test('current price comes from the latest snapshot and delta from the previous one', () => {
	const summaries = buildBrandSummaries(
		[snapshot('2026-08-12T16:30:00', 61.35), snapshot('2026-08-12T16:00:00', 60)],
		[verifiedBrand],
		NOW,
	);
	assert.equal(summaries.length, 1);
	assert.equal(summaries[0]?.snapshotDate, '2026-08-12T16:30:00');
	assert.equal(summaries[0]?.fuels[0]?.average, 61.35);
	assert.equal(summaries[0]?.fuels[0]?.delta, 1.35);
	assert.equal(summaries[0]?.fuels[0]?.trend, 'up');
});

test('prices older than seven days are excluded without fake fallback', () => {
	const stale = snapshot('2026-08-01T10:00:00', 55, '2026-08-01T10:00:00.000Z');
	assert.deepEqual(selectFreshFuels(stale.fuels, NOW.getTime()), []);
	const [summary] = buildBrandSummaries([stale], [verifiedBrand], NOW);
	assert.equal(summary?.stationCount, 3);
	assert.deepEqual(summary?.fuels, []);
});

test('unknown brand slug stays visible but is never indexable', () => {
	const brand = resolveGasBrand('mestnaya-set', [verifiedBrand]);
	assert.equal(brand.name, 'Mestnaya Set');
	assert.equal(brand.isIndexable, false);
});

test('delta is unknown while there is no previous snapshot', () => {
	const [current] = addPriceTrends(snapshot('2026-08-12T16:00:00', 61).fuels);
	assert.equal(current?.delta, null);
	assert.equal(current?.trend, 'unknown');
});

test('SEO readiness requires a verified brand, fresh source and two distinct snapshots', () => {
	const history = [snapshot('2026-08-12T16:00:00', 60), snapshot('2026-08-12T16:30:00', 61)];
	const [summary] = buildBrandSummaries(history, [verifiedBrand], NOW);
	assert.ok(summary);
	assert.equal(isBrandReadyForIndexing(summary, history, NOW.getTime()), true);
	assert.equal(isBrandReadyForIndexing(summary, history.slice(0, 1), NOW.getTime()), false);
	assert.equal(
		isGasPriceHistoryReadyForIndexing(verifiedBrand, NOW.toISOString(), 2, NOW.getTime()),
		true,
	);
	assert.equal(
		isGasPriceHistoryReadyForIndexing(verifiedBrand, NOW.toISOString(), 1, NOW.getTime()),
		false,
	);
});

test('cyrillic brand slug becomes a latin url and keeps the directus source slug', () => {
	assert.equal(toLatinBrandSlug('крайснефть'), 'kraysneft');
	assert.equal(toLatinBrandSlug('брк'), 'brk');
	assert.equal(toLatinBrandSlug('%D0%B1%D1%80%D0%BA'), 'brk');

	const registry = mergeBrandRegistry([]);
	const known = resolveGasBrand('башнефть', registry);
	assert.equal(known.slug, 'bashneft');
	assert.equal(known.sourceSlug, 'башнефть');
	assert.equal(known.name, 'Башнефть');

	const unknown = resolveGasBrand('крайснефть', registry);
	assert.equal(unknown.slug, 'kraysneft');
	assert.equal(unknown.sourceSlug, 'крайснефть');
	assert.equal(unknown.isIndexable, false);
});
