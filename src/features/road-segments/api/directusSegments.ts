import type { RoadSegment, RoadSegmentPrices } from '../model/types';
import { readDataItems, toRoadSegment, toRoadSegmentPrices } from './dto';

const DIRECTUS_URL = (
	process.env.DIRECTUS_URL ||
	process.env.PUBLIC_DIRECTUS_URL ||
	import.meta.env.PUBLIC_DIRECTUS_URL ||
	'https://api.za-rulem.org'
).replace(/\/$/, '');

const DIRECTUS_TOKEN = process.env.DIRECTUS_GAS_PRICES_TOKEN || '';
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Directus обрывает соединение при массовой генерации участков, поэтому сетевая ошибка
 * повторяется один раз и только затем деградирует до пустого ответа: цены и список участков
 * вспомогательные, из-за них сборка падать не должна.
 */
const requestWithRetry = async (url: string, headers: Headers): Promise<Response | null> => {
	for (let attempt = 0; attempt < 2; attempt += 1) {
		try {
			return await fetch(url, { headers, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
		} catch (error) {
			console.warn(
				`[road-segments] Directus request failed (attempt ${attempt + 1}):`,
				error instanceof Error ? error.message : error,
			);
		}
	}
	return null;
};

const request = async (path: string): Promise<unknown> => {
	const headers = new Headers({ Accept: 'application/json' });
	if (DIRECTUS_TOKEN) headers.set('Authorization', `Bearer ${DIRECTUS_TOKEN}`);
	const response = await requestWithRetry(`${DIRECTUS_URL}${path}`, headers);
	if (!response) return { data: [] };
	if (!response.ok) {
		if (response.status === 400 || response.status === 403 || response.status === 404) {
			console.warn(`[road-segments] Directus access issue (${response.status}) for: ${path}`);
			return { data: [] };
		}
		throw new Error(`Directus road segments request failed: ${response.status}`);
	}
	return response.status === 204 ? null : response.json();
};

/**
 * `fields=*` вместо перечисления полей: расширенная схема участка (`sort`, `start_*`,
 * `bounds_*`, `geometry`) может быть ещё не импортирована в Directus, и строгий список
 * полей приводил бы к 403 и потере всех страниц участков.
 */
export const readRoadSegments = async (): Promise<RoadSegment[]> => {
	const params = new URLSearchParams({
		limit: '-1',
		fields: '*',
		'filter[status][_eq]': 'published',
	});
	const payload = await request(`/items/road_segments?${params.toString()}`);
	return readDataItems(payload)
		.map(toRoadSegment)
		.filter((segment): segment is RoadSegment => segment !== null);
};

const parsePrices = (payload: unknown): RoadSegmentPrices[] =>
	readDataItems(payload)
		.map(toRoadSegmentPrices)
		.filter((price): price is RoadSegmentPrices => price !== null);

/** Снимки цен участков хранятся в единой коллекции `gas_daily` (`area_type = road`). */
export const readSegmentPrices = async (segmentSlug: string): Promise<RoadSegmentPrices[]> => {
	const params = new URLSearchParams({
		limit: '1000',
		fields: 'id,area_type,area_slug,brand_slug,snapshot_date,station_count,source_updated_at,fuel_prices,date_created',
		sort: '-snapshot_date',
		'filter[area_type][_eq]': 'road',
		'filter[area_slug][_eq]': segmentSlug,
	});
	return parsePrices(await request(`/items/gas_daily?${params.toString()}`));
};
