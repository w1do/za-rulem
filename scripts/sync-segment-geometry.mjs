/**
 * Загружает рассчитанную геометрию участков трасс из `directus_road_segments.json`
 * в коллекцию Directus `road_segments`.
 *
 * Скрипт `segments:geometry` только считает `center`, `start_*`, `end_*`, `bounds_*`,
 * `geometry` и `sort` в локальном файле. Без этой заливки Directus отдаёт участки
 * с московским центром и пустой геометрией, из-за чего карта участка показывает Москву
 * без линии маршрута и без АЗС.
 *
 * Запуск: DIRECTUS_GAS_PRICES_TOKEN=... node scripts/sync-segment-geometry.mjs [--dry-run]
 */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

/** Node не читает `.env` сам, а файл проекта сохранён с CRLF — значения чистим вручную. */
const loadEnvFile = async () => {
	let content;
	try {
		content = await readFile(resolve('.env'), 'utf8');
	} catch {
		return;
	}
	for (const line of content.split('\n')) {
		const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line.replace(/\r$/, ''));
		if (!match) continue;
		const [, name, rawValue] = match;
		if (process.env[name]) continue;
		process.env[name] = rawValue.trim().replace(/^["']|["']$/g, '');
	}
};

await loadEnvFile();

const args = process.argv.slice(2);
const readArgument = (name, fallback) => {
	const found = args.find((argument) => argument.startsWith(`--${name}=`));
	return found ? found.slice(name.length + 3) : fallback;
};

const itemsPath = readArgument('items', 'directus_road_segments.json');
const directusUrl = readArgument(
	'directus',
	process.env.DIRECTUS_URL || process.env.PUBLIC_DIRECTUS_URL || 'https://api.za-rulem.org',
).replace(/\/$/, '');
const token = process.env.DIRECTUS_GAS_PRICES_TOKEN || readArgument('token', '');
const isDryRun = args.includes('--dry-run');
const REQUEST_TIMEOUT_MS = 30_000;
const CONCURRENCY = 5;

const GEOMETRY_FIELDS = [
	'sort',
	'center',
	'start_lat',
	'start_lon',
	'end_lat',
	'end_lon',
	'corridor_km',
	'geometry',
	'bounds_min_lat',
	'bounds_max_lat',
	'bounds_min_lon',
	'bounds_max_lon',
];

if (!token && !isDryRun) {
	console.error('Нужен DIRECTUS_GAS_PRICES_TOKEN с правом обновления road_segments.');
	process.exit(1);
}

const headers = new Headers({ 'Content-Type': 'application/json', Accept: 'application/json' });
if (token) headers.set('Authorization', `Bearer ${token}`);

const request = async (path, init = {}) => {
	const response = await fetch(`${directusUrl}${path}`, {
		...init,
		headers,
		signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
	});
	if (!response.ok) {
		throw new Error(`${init.method ?? 'GET'} ${path} → ${response.status} ${await response.text()}`);
	}
	return response.status === 204 ? null : response.json();
};

const key = (segment) => `${String(segment.route_code).trim()}|${String(segment.slug).trim()}`;

const hasGeometry = (segment) =>
	Array.isArray(segment.geometry) &&
	segment.geometry.length >= 2 &&
	Number.isFinite(Number(segment.bounds_min_lat));

const { data: remoteItems = [] } = await request(
	'/items/road_segments?limit=-1&fields=id,slug,route_code',
);
const remoteByKey = new Map(remoteItems.map((item) => [key(item), item.id]));

const localItems = JSON.parse(await readFile(resolve(itemsPath), 'utf8'));
const updates = [];
const skipped = [];

for (const segment of localItems) {
	const id = remoteByKey.get(key(segment));
	if (!id) {
		skipped.push(`${segment.route_code} ${segment.slug}: нет записи в Directus`);
		continue;
	}
	if (!hasGeometry(segment)) {
		skipped.push(`${segment.route_code} ${segment.slug}: нет рассчитанной геометрии`);
		continue;
	}
	updates.push([id, Object.fromEntries(GEOMETRY_FIELDS.map((field) => [field, segment[field]]))]);
}

console.log(`К обновлению участков: ${updates.length} из ${localItems.length}`);
if (isDryRun) {
	skipped.forEach((message) => console.log(`Пропущен ${message}`));
	process.exit(0);
}

let updated = 0;
const failures = [];

for (let index = 0; index < updates.length; index += CONCURRENCY) {
	await Promise.all(
		updates.slice(index, index + CONCURRENCY).map(async ([id, payload]) => {
			try {
				await request(`/items/road_segments/${id}`, {
					method: 'PATCH',
					body: JSON.stringify(payload),
				});
				updated += 1;
			} catch (error) {
				failures.push(`${id}: ${error instanceof Error ? error.message : error}`);
			}
		}),
	);
}

console.log(`Обновлено участков: ${updated}`);
skipped.forEach((message) => console.log(`Пропущен ${message}`));
failures.forEach((message) => console.log(`Ошибка ${message}`));
if (failures.length > 0) process.exit(1);
