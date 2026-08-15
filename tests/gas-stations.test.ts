import test from 'node:test';
import assert from 'node:assert/strict';

import { toStationData, toStationPricesSnapshot } from '../src/features/gas-stations/api/dto.ts';
import { hasStationCoordinates } from '../src/lib/gasStations.ts';

test('point snapshot from gas_daily is mapped with camelCase fuel aggregates', () => {
	const snapshot = toStationPricesSnapshot({
		id: 'point:1830115629602280:2026-08-15T12:30:00Z',
		station: '1830115629602280',
		area_type: 'point',
		area_slug: '1830115629602280',
		area_parent_slug: 'tyumen',
		brand_slug: 'н-1',
		snapshot_date: '2026-08-15T12:30:00.000Z',
		fuel_prices: [
			{ fuelType: 'AI_95', average: 68.09, updatedAt: '2026-08-15T06:10:32Z' },
			{ fuelType: 'DT', average: 0 },
		],
	});

	assert.ok(snapshot);
	assert.equal(snapshot.stationId, '1830115629602280');
	assert.equal(snapshot.brandSlug, 'н-1');
	assert.deepEqual(snapshot.prices, [
		{
			station_id: '1830115629602280',
			fuel_type: 'AI_95',
			price: 68.09,
			updated_at: '2026-08-15T06:10:32Z',
		},
	]);
});

test('legacy snake_case aggregates stay supported', () => {
	const snapshot = toStationPricesSnapshot({
		station: '42',
		snapshot_date: '2026-08-15T12:30:00.000Z',
		fuel_prices: [{ fuel_type: 'AI_92', price: 64.09, updated_at: '2026-08-15T06:00:00Z' }],
	});

	assert.ok(snapshot);
	assert.equal(snapshot.prices[0].fuel_type, 'AI_92');
	assert.equal(snapshot.prices[0].price, 64.09);
});

test('snapshot without usable prices is rejected', () => {
	assert.equal(
		toStationPricesSnapshot({
			station: '42',
			snapshot_date: '2026-08-15T12:30:00.000Z',
			fuel_prices: [{ fuelType: '', average: 10 }],
		}),
		null,
	);
	assert.equal(toStationPricesSnapshot({ station: '42', fuel_prices: [] }), null);
});

test('station without longitude is kept in the list but never mapped', () => {
	const station = toStationData({
		id: '1830115629602280',
		name: 'Н-1, АЗС',
		address: 'Тюмень, 50 лет ВЛКСМ, 61',
		lat: 57.13423,
		lng: undefined,
	});

	assert.equal(station.station.lng, 0);
	assert.equal(hasStationCoordinates(station), false);

	const located = toStationData({
		id: '1',
		name: 'Лукойл',
		address: 'Тюмень',
		lat: 57.1,
		lng: 65.5,
	});

	assert.equal(hasStationCoordinates(located), true);
});
