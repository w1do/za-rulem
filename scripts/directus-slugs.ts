/**
 * Проставляет латинские slug в Directus:
 * - `stations.slug` — уникальный латинский идентификатор конкретной АЗС;
 * - `stations.brand` — английский slug сети (кириллица приводится к канону);
 * - `gas_daily.brand_slug` — латинский slug сети (кириллица транслитерируется).
 *
 * Скрипт идемпотентен: уже латинские значения не переписываются.
 *
 * Настройки берутся из окружения, а при их отсутствии — из `.env` в корне проекта
 * (`DIRECTUS_URL` или `PUBLIC_DIRECTUS_URL`; `DIRECTUS_ADMIN_TOKEN` или `DIRECTUS_GAS_PRICES_TOKEN`).
 *
 * Запуск:
 *   npm run directus:slugs -- --dry-run
 *   npm run directus:slugs
 */
import { readFileSync } from 'node:fs';
import { canonicalBrandSlug, toLatinBrandSlug } from '../src/features/gas-prices/model/brandSlug.ts';

const DRY_RUN = process.argv.includes('--dry-run');
const BATCH_SIZE = 100;
const REQUEST_TIMEOUT_MS = 60_000;
const ENV_FILE = new URL('../.env', import.meta.url);

/** Переменные окружения имеют приоритет; `.env` — запасной источник для локального запуска. */
const readEnvFile = (): Record<string, string> => {
	let content: string;
	try {
		content = readFileSync(ENV_FILE, 'utf8');
	} catch {
		return {};
	}
	const values: Record<string, string> = {};
	for (const rawLine of content.split('\n')) {
		const line = rawLine.replace(/\r$/, '').trim();
		if (!line || line.startsWith('#')) continue;
		const separator = line.indexOf('=');
		if (separator <= 0) continue;
		const key = line.slice(0, separator).replace(/^export\s+/, '').trim();
		const value = line.slice(separator + 1).trim().replace(/^["']|["']$/g, '');
		if (key) values[key] = value;
	}
	return values;
};

const fileEnv = readEnvFile();
const env = (name: string): string => (process.env[name] || fileEnv[name] || '').trim();

const DIRECTUS_URL = (env('DIRECTUS_URL') || env('PUBLIC_DIRECTUS_URL')).replace(/\/$/, '');
const TOKEN = env('DIRECTUS_ADMIN_TOKEN') || env('DIRECTUS_GAS_PRICES_TOKEN');

if (!DIRECTUS_URL || !TOKEN) {
	console.error(
		'Не хватает настроек Directus (окружение или .env):' +
			`\n  URL (DIRECTUS_URL / PUBLIC_DIRECTUS_URL): ${DIRECTUS_URL || 'не задан'}` +
			`\n  токен (DIRECTUS_ADMIN_TOKEN / DIRECTUS_GAS_PRICES_TOKEN): ${TOKEN ? 'найден' : 'не задан'}`
	);
	process.exit(1);
}

console.log(`Directus: ${DIRECTUS_URL}${DRY_RUN ? ' (пробный прогон)' : ''}`);

type Json = Record<string, unknown>;

const request = async (path: string, init: RequestInit = {}): Promise<Json> => {
	const response = await fetch(`${DIRECTUS_URL}${path}`, {
		...init,
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			Authorization: `Bearer ${TOKEN}`,
			...(init.headers as Record<string, string> | undefined),
		},
		signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
	});
	if (!response.ok) {
		throw new Error(`${init.method ?? 'GET'} ${path} → ${response.status} ${await response.text()}`);
	}
	return response.status === 204 ? {} : (await response.json()) as Json;
};

const readItems = async (collection: string, fields: string, extra: Record<string, string> = {}) => {
	const items: Json[] = [];
	let page = 1;
	for (;;) {
		const params = new URLSearchParams({ fields, limit: '500', page: String(page), sort: 'id', ...extra });
		const payload = await request(`/items/${collection}?${params.toString()}`);
		const data = Array.isArray(payload.data) ? payload.data as Json[] : [];
		items.push(...data);
		if (data.length < 500) return items;
		page += 1;
	}
};

const patchBatch = async (collection: string, updates: { id: unknown; data: Json }[]): Promise<void> => {
	for (let index = 0; index < updates.length; index += BATCH_SIZE) {
		const slice = updates.slice(index, index + BATCH_SIZE);
		if (DRY_RUN) {
			console.log(`[dry-run] ${collection}: ${slice.length} записей`, slice.slice(0, 3));
			continue;
		}
		/** Directus обновляет разные значения только поштучно, общий PATCH пишет одно и то же. */
		await Promise.all(slice.map((update) =>
			request(`/items/${collection}/${encodeURIComponent(String(update.id))}`, {
				method: 'PATCH',
				body: JSON.stringify(update.data),
			})
		));
		console.log(`${collection}: обновлено ${Math.min(index + BATCH_SIZE, updates.length)}/${updates.length}`);
	}
};

const isLatinSlug = (value: unknown): value is string =>
	typeof value === 'string' && value.length > 0 && /^[a-z0-9-]+$/.test(value);

const stringValue = (value: unknown): string => (typeof value === 'string' ? value : '');

/** Слаг станции читаемый: сеть + название/адрес; уникальность гарантирует суффикс. */
const buildStationSlug = (station: Json, taken: Set<string>): string => {
	const brand = toLatinBrandSlug(stringValue(station.brand));
	const place = toLatinBrandSlug(stringValue(station.address) || stringValue(station.name));
	const parts = brand && place.startsWith(`${brand}-`) ? [place] : [brand, place].filter(Boolean);
	const base = parts.join('-').slice(0, 80).replace(/-+$/, '') ||
		`azs-${toLatinBrandSlug(String(station.id))}`;
	let slug = base;
	let suffix = 2;
	while (taken.has(slug)) {
		slug = `${base}-${suffix}`;
		suffix += 1;
	}
	taken.add(slug);
	return slug;
};

const syncStationSlugs = async (): Promise<void> => {
	const stations = await readItems('stations', 'id,name,brand,address,slug');
	const taken = new Set(stations.map((station) => station.slug).filter(isLatinSlug));
	const updates = stations
		.filter((station) => !isLatinSlug(station.slug))
		.map((station) => ({ id: station.id, data: { slug: buildStationSlug(station, taken) } }));

	console.log(`stations: всего ${stations.length}, требуют slug ${updates.length}`);
	await patchBatch('stations', updates);
};

/** Бренд станции — технический slug сети, поэтому хранится по-английски. */
const syncStationBrands = async (): Promise<void> => {
	const stations = await readItems('stations', 'id,brand');
	const updates = stations.flatMap((station) => {
		const current = stringValue(station.brand);
		const brand = canonicalBrandSlug(current);
		return brand && brand !== current ? [{ id: station.id, data: { brand } }] : [];
	});

	console.log(`stations: требуют английского бренда ${updates.length}`);
	await patchBatch('stations', updates);
};

const syncBrandSlugs = async (): Promise<void> => {
	const snapshots = await readItems('gas_daily', 'id,brand_slug');
	/** Slug сети в снимках и в `stations.brand` обязан совпадать: по нему строятся страницы сетей. */
	const mapping = new Map<string, string>();
	const updates = snapshots.flatMap((snapshot) => {
		const source = stringValue(snapshot.brand_slug);
		const brandSlug = canonicalBrandSlug(source);
		if (!brandSlug || brandSlug === source) return [];
		mapping.set(source, brandSlug);
		return [{ id: snapshot.id, data: { brand_slug: brandSlug } }];
	});

	console.log(`gas_daily: всего ${snapshots.length}, требуют нормализации ${updates.length}`);
	for (const [source, latin] of mapping) console.log(`  ${source} → ${latin}`);
	await patchBatch('gas_daily', updates);
};

await syncStationSlugs();
await syncStationBrands();
await syncBrandSlugs();
console.log(DRY_RUN ? 'Пробный прогон завершён, данные не изменены.' : 'Готово.');
