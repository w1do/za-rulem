import test from 'node:test';
import assert from 'node:assert/strict';

import { buildQueueBoard } from '../src/features/gas-queues/model/buildQueueBoard.ts';
import { resolveQueueBucket } from '../src/features/gas-queues/model/queueLevels.ts';
import type { StationData } from '../src/lib/gasStations.ts';

const NOW = Date.parse('2026-08-15T12:00:00.000Z');

interface StationOptions {
	id?: string;
	queueLevel?: string;
	closed?: boolean;
	updatedAt?: string;
	prices?: { fuel_type: string; price: number }[];
	name?: string;
}

const station = ({
	id = 'station-1',
	queueLevel = 'NONE',
	closed = false,
	updatedAt = new Date(NOW - 60_000).toISOString(),
	prices = [],
	name = 'АЗС',
}: StationOptions = {}): StationData =>
	({
		station: {
			id,
			name,
			brand: 'Тест',
			address: 'ул. Тестовая, 1',
			lat: 57.15,
			lng: 65.53,
			last_transaction_at: updatedAt,
		},
		fuel_statuses: [],
		prices: prices.map((price) => ({ ...price, station_id: id, updated_at: updatedAt })),
		status: 'OK',
		closed,
		queue_level: queueLevel,
	}) as unknown as StationData;

const bucketOf = (board: ReturnType<typeof buildQueueBoard>, id: string) => {
	const bucket = board.buckets.find((item) => item.id === id);
	assert.ok(bucket, `Корзина ${id} должна существовать`);
	return bucket;
};

test('распределяет станции по корзинам согласно уровню очереди', () => {
	const board = buildQueueBoard(
		[
			station({ id: 'free', queueLevel: 'NONE' }),
			station({ id: 'small', queueLevel: 'UP_TO_25' }),
			station({ id: 'large', queueLevel: 'OVER_50' }),
		],
		NOW,
	);

	assert.equal(board.hasData, true);
	assert.equal(board.totalStations, 3);
	assert.deepEqual(
		bucketOf(board, 'free').stations.map((item) => item.id),
		['free'],
	);
	assert.deepEqual(
		bucketOf(board, 'small').stations.map((item) => item.id),
		['small'],
	);
	assert.deepEqual(
		bucketOf(board, 'large').stations.map((item) => item.id),
		['large'],
	);
});

test('исключает закрытые, устаревшие и станции без данных об очереди', () => {
	const board = buildQueueBoard(
		[
			station({ id: 'closed', closed: true }),
			station({ id: 'stale', updatedAt: new Date(NOW - 48 * 60 * 60 * 1000).toISOString() }),
			station({ id: 'unknown', queueLevel: 'WHATEVER' }),
		],
		NOW,
	);

	assert.equal(board.hasData, false);
	assert.equal(board.totalStations, 0);
	assert.equal(board.updatedAt, null);
});

test('сортирует по свежести, затем по цене АИ-95', () => {
	const fresh = new Date(NOW - 60_000).toISOString();
	const older = new Date(NOW - 120_000).toISOString();
	const board = buildQueueBoard(
		[
			station({ id: 'old', updatedAt: older }),
			station({
				id: 'fresh-expensive',
				updatedAt: fresh,
				prices: [{ fuel_type: 'AI_95', price: 60 }],
			}),
			station({ id: 'fresh-cheap', updatedAt: fresh, prices: [{ fuel_type: 'AI_95', price: 55 }] }),
		],
		NOW,
	);

	assert.deepEqual(
		bucketOf(board, 'free').stations.map((item) => item.id),
		['fresh-cheap', 'fresh-expensive', 'old'],
	);
	assert.equal(board.updatedAt, fresh);
});

test('ограничивает число карточек, но считает все свежие АЗС', () => {
	const stations = Array.from({ length: 9 }, (_, index) =>
		station({ id: `station-${index}`, updatedAt: new Date(NOW - index * 1000).toISOString() }),
	);
	const board = buildQueueBoard(stations, NOW);
	const free = bucketOf(board, 'free');

	assert.equal(free.total, 9);
	assert.equal(free.stations.length, 6);
	assert.equal(free.stations[0].id, 'station-0');
});

test('нормализует цены и подписи видов топлива', () => {
	const board = buildQueueBoard(
		[
			station({
				prices: [
					{ fuel_type: 'DT', price: 70.5 },
					{ fuel_type: 'AI_92', price: 0 },
					{ fuel_type: 'AI_95', price: 58.2 },
				],
			}),
		],
		NOW,
	);

	const card = bucketOf(board, 'free').stations[0];
	assert.deepEqual(
		card.prices.map((price) => price.label),
		['95', 'ДТ'],
	);
	assert.equal(card.statusLabel, 'Без очереди');
});

test('resolveQueueBucket не доверяет закрытым АЗС и неизвестным уровням', () => {
	assert.equal(resolveQueueBucket('NONE'), 'free');
	assert.equal(resolveQueueBucket('none'), 'free');
	assert.equal(resolveQueueBucket('NONE', true), 'unknown');
	assert.equal(resolveQueueBucket(null), 'unknown');
	assert.equal(resolveQueueBucket('FROM_25_TO_50'), 'large');
});
