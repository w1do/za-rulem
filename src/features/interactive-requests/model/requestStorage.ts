/**
 * Чистые функции хранения заявок: чтение/запись localStorage и отсев устаревших меток.
 * Вынесены из хука, чтобы их можно было тестировать без React и браузера.
 */

import { REQUEST_TTL_MS } from './constants.ts';
import { findTariff } from './pricing.ts';
import type { MapRequest, RequestKind } from './types.ts';

/** Ключ localStorage: свой для каждого вида заявок и города. */
export const buildStorageKey = (kind: RequestKind, citySlug: string): string =>
	`gaztochka:requests:${kind}:${citySlug}`;

const isMapRequest = (value: unknown): value is MapRequest => {
	if (typeof value !== 'object' || value === null) return false;
	const candidate = value as Record<string, unknown>;

	return (
		typeof candidate.id === 'string' &&
		(candidate.kind === 'queue' || candidate.kind === 'assistance') &&
		typeof candidate.tariffId === 'string' &&
		(candidate.urgency === 'red' ||
			candidate.urgency === 'yellow' ||
			candidate.urgency === 'green') &&
		typeof candidate.lat === 'number' &&
		typeof candidate.lng === 'number' &&
		typeof candidate.price === 'number' &&
		typeof candidate.phone === 'string' &&
		typeof candidate.message === 'string' &&
		typeof candidate.createdAt === 'number' &&
		findTariff(candidate.kind, candidate.tariffId) !== null
	);
};

/** Разбирает недоверенное содержимое localStorage в список заявок. */
export const parseStoredRequests = (raw: string | null): MapRequest[] => {
	if (!raw) return [];

	try {
		const parsed: unknown = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed.filter(isMapRequest) : [];
	} catch {
		return [];
	}
};

/** Оставляет только «живые» заявки: не старше TTL. */
export const dropExpiredRequests = (
	requests: MapRequest[],
	now = Date.now(),
): MapRequest[] =>
	requests.filter((request) => now - request.createdAt < REQUEST_TTL_MS);

/** Сортирует заявки: сначала срочные, внутри уровня — самые свежие. */
export const sortRequests = (requests: MapRequest[]): MapRequest[] => {
	const weight = { red: 0, yellow: 1, green: 2 } as const;

	return [...requests].sort(
		(a, b) => weight[a.urgency] - weight[b.urgency] || b.createdAt - a.createdAt,
	);
};

/** Объединяет заявки пользователя с демонстрационными, отбрасывая дубли по id. */
export const mergeRequests = (
	seed: MapRequest[],
	stored: MapRequest[],
	now = Date.now(),
): MapRequest[] => {
	const byId = new Map<string, MapRequest>();
	for (const request of [...seed, ...stored]) {
		byId.set(request.id, request);
	}

	return sortRequests(dropExpiredRequests([...byId.values()], now));
};
