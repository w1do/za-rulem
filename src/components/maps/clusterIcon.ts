/**
 * Разметка кластерных маркеров: круглый бейдж с количеством АЗС и кольцом-прогрессом,
 * которое показывает соотношение очередей внутри кластера.
 */

import { getQueueCategoryColor, type QueueColorCategory } from './markerIcons.ts';

export type ClusterSizeName = 'small' | 'medium' | 'large';

interface ClusterSize {
	name: ClusterSizeName;
	/** Сторона квадратной иконки кластера в пикселях. */
	side: number;
}

const CLUSTER_SIZES: ClusterSize[] = [
	{ name: 'small', side: 40 },
	{ name: 'medium', side: 50 },
	{ name: 'large', side: 60 },
];

const MEDIUM_THRESHOLD = 10;
const LARGE_THRESHOLD = 50;

/** Размерная категория кластера по количеству станций. */
export const resolveClusterSizeName = (count: number): ClusterSizeName => {
	if (count >= LARGE_THRESHOLD) return 'large';
	if (count >= MEDIUM_THRESHOLD) return 'medium';
	return 'small';
};

const findSize = (name: ClusterSizeName): ClusterSize =>
	CLUSTER_SIZES.find((size) => size.name === name) ?? CLUSTER_SIZES[0];

/** Подпись кластера: большие значения сокращаются до «99+». */
export const formatClusterCount = (count: number): string =>
	count > 99 ? '99+' : String(count);

/** Количество станций кластера по цветовым категориям очереди. */
export type ClusterQueueBreakdown = Partial<Record<QueueColorCategory, number>>;

/** Порядок сегментов кольца: от свободных к неизвестным. */
const SEGMENT_ORDER: QueueColorCategory[] = ['green', 'orange', 'red', 'neutral'];

/** Цвет кольца, когда данных об очередях в кластере нет. */
const EMPTY_RING_COLOR = '#F5B754';

/**
 * CSS-градиент кольца кластера: доля каждого цвета равна доле станций
 * соответствующей категории очереди.
 */
export const buildClusterRingGradient = (breakdown: ClusterQueueBreakdown): string => {
	const segments = SEGMENT_ORDER.map((category) => ({
		category,
		value: Math.max(0, Math.floor(breakdown[category] ?? 0)),
	})).filter((segment) => segment.value > 0);

	const total = segments.reduce((sum, segment) => sum + segment.value, 0);
	if (total === 0) return EMPTY_RING_COLOR;

	if (segments.length === 1) return getQueueCategoryColor(segments[0].category);

	const stops: string[] = [];
	let offset = 0;

	segments.forEach((segment, index) => {
		const color = getQueueCategoryColor(segment.category);
		const start = offset;
		offset += (segment.value / total) * 360;
		const end = index === segments.length - 1 ? 360 : offset;
		stops.push(`${color} ${start.toFixed(2)}deg ${end.toFixed(2)}deg`);
	});

	return `conic-gradient(from -90deg, ${stops.join(', ')})`;
};

export interface ClusterIconMarkup {
	html: string;
	className: string;
	size: [number, number];
}

/** Готовая разметка кластера для `DG.divIcon`. */
export const buildClusterIconMarkup = (
	count: number,
	breakdown: ClusterQueueBreakdown = {},
): ClusterIconMarkup => {
	const safeCount = Number.isFinite(count) && count > 0 ? Math.floor(count) : 0;
	const sizeName = resolveClusterSizeName(safeCount);
	const { side } = findSize(sizeName);
	const gradient = buildClusterRingGradient(breakdown);

	return {
		html: [
			`<span class="gas-cluster__ring" style="background:${gradient}"></span>`,
			`<span class="gas-cluster__inner"><span class="gas-cluster__count">${formatClusterCount(safeCount)}</span></span>`,
		].join(''),
		className: `gas-cluster gas-cluster--${sizeName}`,
		size: [side, side],
	};
};
