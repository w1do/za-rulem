/**
 * Каноническая таблица интерпретации `queue_level` из реестра `stations`.
 * Единственный источник правды для карточек очередей, фильтров списка и пинов карты,
 * чтобы карта и текстовые статусы никогда не расходились.
 */

export type QueueBucketId = 'free' | 'small' | 'large';

export type QueueLevelBucket = QueueBucketId | 'unknown';

export interface QueueBucketMeta {
	/** Человекочитаемый статус конкретной АЗС. */
	statusLabel: string;
	/** Заголовок группы карточек. */
	title: string;
	/** Короткое пояснение под заголовком группы. */
	hint: string;
	/** Основной цвет статуса. */
	color: string;
}

/** Цветовая шкала маркеров карты: она мягче текстовых корзин на среднем уровне. */
export type QueueMarkerTone = 'green' | 'orange' | 'red';

interface QueueLevelRule {
	/** Корзина карточек: без очереди / небольшая / большая. */
	bucket: QueueBucketId;
	/** Цвет пина на карте. */
	tone: QueueMarkerTone;
}

const QUEUE_LEVELS: Record<string, QueueLevelRule> = {
	NONE: { bucket: 'free', tone: 'green' },
	NO_QUEUE: { bucket: 'free', tone: 'green' },
	UP_TO_25: { bucket: 'small', tone: 'orange' },
	FROM_10_TO_25: { bucket: 'small', tone: 'orange' },
	FROM_25_TO_50: { bucket: 'large', tone: 'orange' },
	OVER_50: { bucket: 'large', tone: 'red' },
	FROM_50: { bucket: 'large', tone: 'red' },
	CRITICAL: { bucket: 'large', tone: 'red' },
};

export const QUEUE_BUCKET_META: Record<QueueBucketId, QueueBucketMeta> = {
	free: {
		statusLabel: 'Без очереди',
		title: 'Без очереди',
		hint: 'Можно ехать прямо сейчас — машин на заправке нет.',
		color: '#059669',
	},
	small: {
		statusLabel: 'Небольшая очередь',
		title: 'Небольшая очередь',
		hint: 'Ожидание есть, но короткое: до 25 машин.',
		color: '#f59e0b',
	},
	large: {
		statusLabel: 'Большая очередь',
		title: 'Большая очередь',
		hint: 'Лучше объехать: заправка перегружена.',
		color: '#dc2626',
	},
};

export const QUEUE_BUCKET_ORDER: QueueBucketId[] = ['free', 'small', 'large'];

/** Сопоставляет сырое значение `queue_level` с корзиной очереди. */
export const resolveQueueBucket = (
	queueLevel: string | null | undefined,
	isClosed = false,
): QueueLevelBucket => {
	if (isClosed) return 'unknown';
	const level = (queueLevel ?? '').trim().toUpperCase();
	return QUEUE_LEVELS[level]?.bucket ?? 'unknown';
};

/** Цветовая категория пина карты для сырого `queue_level`. */
export const resolveQueueMarkerTone = (
	queueLevel: string | null | undefined,
): QueueMarkerTone | null => {
	const level = (queueLevel ?? '').trim().toUpperCase();
	return QUEUE_LEVELS[level]?.tone ?? null;
};

/** Уровни, попадающие в указанные корзины — для фильтров списка станций. */
export const getQueueLevelsForBuckets = (buckets: QueueBucketId[]): string[] =>
	Object.entries(QUEUE_LEVELS)
		.filter(([, rule]) => buckets.includes(rule.bucket))
		.map(([level]) => level);
