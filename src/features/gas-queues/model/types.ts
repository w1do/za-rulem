/** Read-модели блока «где заправиться без очереди». */

import type { QueueBucketId } from './queueLevels.ts';

export type { QueueBucketId };

export interface QueuePriceView {
	fuelType: string;
	label: string;
	price: number;
}

export interface QueueStationCardModel {
	id: string;
	name: string;
	brand: string;
	address: string;
	bucket: QueueBucketId;
	statusLabel: string;
	/** ISO-время последнего снимка данных по АЗС. */
	updatedAt: string;
	prices: QueuePriceView[];
}

export interface QueueBucketView {
	id: QueueBucketId;
	title: string;
	hint: string;
	color: string;
	/** Всего свежих АЗС в корзине, включая не показанные карточками. */
	total: number;
	stations: QueueStationCardModel[];
}

export interface CityQueueBoard {
	buckets: QueueBucketView[];
	totalStations: number;
	updatedAt: string | null;
	hasData: boolean;
}
