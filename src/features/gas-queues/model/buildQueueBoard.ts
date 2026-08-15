/**
 * Чистая сборка сводки очередей города из свежих данных АЗС.
 * Никаких запросов и побочных эффектов: вход — станции, выход — read-модель для UI.
 */

import { getFuelName, isStationDataFresh, type StationData } from '../../../lib/gasStations.ts';
import {
	QUEUE_BUCKET_META,
	QUEUE_BUCKET_ORDER,
	resolveQueueBucket,
	type QueueBucketId,
} from './queueLevels.ts';
import type { CityQueueBoard, QueuePriceView, QueueStationCardModel } from './types.ts';

/** Сколько карточек показываем в одной группе, чтобы страница не разрасталась. */
export const QUEUE_BUCKET_CARD_LIMIT = 6;

const FUEL_ORDER = ['AI_92', 'AI_95', 'AI_98', 'AI_100', 'DT', 'GAS'];

const toPriceViews = (station: StationData): QueuePriceView[] => {
	const seen = new Set<string>();

	return (station.prices ?? [])
		.filter((price) => {
			const value = Number(price?.price);
			if (!Number.isFinite(value) || value <= 0) return false;
			if (typeof price.fuel_type !== 'string' || price.fuel_type.length === 0) return false;
			if (seen.has(price.fuel_type)) return false;
			seen.add(price.fuel_type);
			return true;
		})
		.map((price) => ({
			fuelType: price.fuel_type,
			label: getFuelName(price.fuel_type),
			price: Number(price.price),
		}))
		.sort((a, b) => {
			const left = FUEL_ORDER.indexOf(a.fuelType);
			const right = FUEL_ORDER.indexOf(b.fuelType);
			return (left === -1 ? FUEL_ORDER.length : left) - (right === -1 ? FUEL_ORDER.length : right);
		});
};

const getReferencePrice = (card: QueueStationCardModel): number | null =>
	card.prices.find((price) => price.fuelType === 'AI_95')?.price ?? null;

const toCard = (station: StationData, bucket: QueueBucketId): QueueStationCardModel => ({
	id: station.station.id,
	name: station.station.name,
	brand: station.station.brand,
	address: station.station.address,
	bucket,
	statusLabel: QUEUE_BUCKET_META[bucket].statusLabel,
	updatedAt: station.station.last_transaction_at,
	prices: toPriceViews(station),
});

/** Сначала самые свежие данные, при равенстве — более дешёвый АИ-95. */
const compareCards = (a: QueueStationCardModel, b: QueueStationCardModel): number => {
	const byFreshness = Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
	if (byFreshness !== 0) return byFreshness;

	const priceA = getReferencePrice(a);
	const priceB = getReferencePrice(b);
	if (priceA !== null && priceB !== null && priceA !== priceB) return priceA - priceB;
	if (priceA !== null && priceB === null) return -1;
	if (priceA === null && priceB !== null) return 1;

	return a.name.localeCompare(b.name, 'ru-RU');
};

/** Группирует свежие открытые АЗС города по загруженности. */
export const buildQueueBoard = (
	stations: StationData[],
	now = Date.now(),
	limit = QUEUE_BUCKET_CARD_LIMIT,
): CityQueueBoard => {
	const grouped = new Map<QueueBucketId, QueueStationCardModel[]>(
		QUEUE_BUCKET_ORDER.map((bucket) => [bucket, []]),
	);
	let updatedAt: number | null = null;

	for (const station of stations) {
		if (!station?.station?.id) continue;
		if (station.closed) continue;
		if (!isStationDataFresh(station, now)) continue;

		const bucket = resolveQueueBucket(station.queue_level, station.closed);
		if (bucket === 'unknown') continue;

		grouped.get(bucket)?.push(toCard(station, bucket));

		const stationUpdatedAt = Date.parse(station.station.last_transaction_at);
		if (Number.isFinite(stationUpdatedAt) && (updatedAt === null || stationUpdatedAt > updatedAt)) {
			updatedAt = stationUpdatedAt;
		}
	}

	const buckets = QUEUE_BUCKET_ORDER.map((id) => {
		const cards = (grouped.get(id) ?? []).sort(compareCards);
		const meta = QUEUE_BUCKET_META[id];

		return {
			id,
			title: meta.title,
			hint: meta.hint,
			color: meta.color,
			total: cards.length,
			stations: cards.slice(0, limit),
		};
	});

	const totalStations = buckets.reduce((sum, bucket) => sum + bucket.total, 0);

	return {
		buckets,
		totalStations,
		updatedAt: updatedAt === null ? null : new Date(updatedAt).toISOString(),
		hasData: totalStations > 0,
	};
};
