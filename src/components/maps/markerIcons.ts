/**
 * Генерация SVG-пинов АЗС с цветовой индикацией очереди.
 * Зелёный — свободно, оранжевый — средняя очередь, красный — большая, серый — нет данных.
 */

import { resolveQueueMarkerTone } from '../../features/gas-queues/model/queueLevels.ts';
import type { StationData } from '../../lib/gasStations';

export type QueueColorCategory = 'green' | 'orange' | 'red' | 'neutral';

interface QueuePalette {
	/** Основной цвет пина. */
	fill: string;
	/** Обводка и цвет пиктограммы внутри пина. */
	stroke: string;
	/** Человекочитаемая подпись категории. */
	label: string;
}

const QUEUE_PALETTE: Record<QueueColorCategory, QueuePalette> = {
	green: { fill: '#10b981', stroke: '#065f46', label: 'Без очереди' },
	orange: { fill: '#f59e0b', stroke: '#92400e', label: 'Средняя очередь' },
	red: { fill: '#ef4444', stroke: '#7f1d1d', label: 'Большая очередь' },
	neutral: { fill: '#6b7280', stroke: '#1f2937', label: 'Нет данных' },
};

/** Сопоставляет `queue_level` станции с цветовой категорией маркера. */
export const resolveQueueColorCategory = (
	queueLevel: string | null | undefined,
	isClosed = false,
): QueueColorCategory => {
	if (isClosed) return 'neutral';
	return resolveQueueMarkerTone(queueLevel) ?? 'neutral';
};

/** Цветовая категория маркера для конкретной станции. */
export const getStationQueueCategory = (item: StationData): QueueColorCategory =>
	resolveQueueColorCategory(item.queue_level, item.closed);

/** Подпись категории очереди для подсказок и легенды. */
export const getQueueCategoryLabel = (category: QueueColorCategory): string =>
	QUEUE_PALETTE[category].label;

/** Основной цвет категории очереди — используется в списке и попапах. */
export const getQueueCategoryColor = (category: QueueColorCategory): string =>
	QUEUE_PALETTE[category].fill;

/** Собирает SVG пина АЗС в цвете переданной категории. */
export const buildStationMarkerSvg = (category: QueueColorCategory): string => {
	const { fill, stroke } = QUEUE_PALETTE[category];

	return [
		'<svg width="46" height="58" viewBox="0 0 46 58" fill="none" xmlns="http://www.w3.org/2000/svg">',
		`<path d="M23 2C12.5 2 4 10.4 4 20.8 4 34.8 23 55 23 55s19-20.2 19-34.2C42 10.4 33.5 2 23 2Z" fill="${fill}" stroke="#111827" stroke-width="2"/>`,
		'<circle cx="23" cy="21" r="13.5" fill="#ffffff"/>',
		`<rect x="16.5" y="12.5" width="9.5" height="17.5" rx="1.8" fill="${stroke}"/>`,
		`<rect x="18.3" y="14.6" width="5.9" height="4.4" rx="0.8" fill="${fill}"/>`,
		`<rect x="18.3" y="20.6" width="5.9" height="1.5" rx="0.7" fill="${fill}" opacity="0.55"/>`,
		`<rect x="14.8" y="29.3" width="12.9" height="2.6" rx="1.3" fill="${stroke}"/>`,
		`<rect x="24.4" y="16" width="3" height="2.1" rx="1" fill="${stroke}"/>`,
		`<rect x="26" y="17.5" width="2.2" height="8.5" rx="1.1" fill="${stroke}"/>`,
		`<rect x="26" y="24.5" width="4.2" height="2.1" rx="1" fill="${stroke}"/>`,
		'</svg>',
	].join('');
};

/** Кодирует SVG в data-URL без зависимости от `btoa` (работает и в тестах Node). */
export const buildStationMarkerDataUrl = (category: QueueColorCategory): string =>
	`data:image/svg+xml;charset=UTF-8,${encodeURIComponent(buildStationMarkerSvg(category))}`;

export interface StationMarkerIconOptions {
	iconUrl: string;
	iconSize: [number, number];
	iconAnchor: [number, number];
	popupAnchor: [number, number];
}

/** Опции иконки маркера для `DG.icon`. */
export const buildStationMarkerIconOptions = (
	item: StationData,
): StationMarkerIconOptions => ({
	iconUrl: buildStationMarkerDataUrl(getStationQueueCategory(item)),
	iconSize: [40, 50],
	iconAnchor: [20, 50],
	popupAnchor: [0, -48],
});
