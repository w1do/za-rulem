#!/usr/bin/env node
/**
 * Восстанавливает координаты АЗС в Directus `stations` из локальной выгрузки 2GIS.
 *
 * Зачем: воркфлоу читал долготу из несуществующего поля `station.lon`, поэтому у большинства
 * записей `lng` остался `null`, и маркеры не появлялись на карте. Скрипт разовый:
 * после исправления воркфлоу координаты приходят вместе с обычным UPSERT.
 *
 * Использование:
 *   DIRECTUS_URL=... DIRECTUS_TOKEN=... node scripts/backfill-station-coordinates.mjs [файл]
 */
import { readFile } from 'node:fs/promises';

const DIRECTUS_URL = (
	process.env.DIRECTUS_URL ||
	process.env.PUBLIC_DIRECTUS_URL ||
	'https://api.za-rulem.org'
).replace(/\/$/, '');
const TOKEN = process.env.DIRECTUS_TOKEN || process.env.DIRECTUS_GAS_PRICES_TOKEN || '';
const SOURCE_FILE = process.argv[2] || 'stations_to_import.json';
const BATCH_SIZE = 200;

if (!TOKEN) {
	console.error('DIRECTUS_TOKEN is required');
	process.exit(1);
}

const isCoordinate = (value) => typeof value === 'number' && Number.isFinite(value) && value !== 0;

const request = async (path, init) => {
	const response = await fetch(`${DIRECTUS_URL}${path}`, {
		...init,
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
			Authorization: `Bearer ${TOKEN}`,
			...init?.headers,
		},
		signal: AbortSignal.timeout(120_000),
	});

	if (!response.ok) {
		throw new Error(`${init?.method ?? 'GET'} ${path} failed: ${response.status} ${await response.text()}`);
	}

	return response.status === 204 ? null : response.json();
};

const readMissingIds = async () => {
	const ids = new Set();
	const limit = 5000;

	for (let page = 1; ; page += 1) {
		const params = new URLSearchParams({
			limit: String(limit),
			page: String(page),
			fields: 'id',
			'filter[lng][_null]': 'true',
		});
		const payload = await request(`/items/stations?${params.toString()}`);
		const items = payload?.data ?? [];
		items.forEach((item) => ids.add(String(item.id)));
		if (items.length < limit) break;
	}

	return ids;
};

const main = async () => {
	const source = JSON.parse(await readFile(SOURCE_FILE, 'utf8'));
	const coordinates = new Map(
		source
			.filter((item) => isCoordinate(item.lat) && isCoordinate(item.lng))
			.map((item) => [String(item.id), { lat: item.lat, lng: item.lng }]),
	);
	console.log(`Source file: ${source.length} stations, ${coordinates.size} with coordinates`);

	const missingIds = await readMissingIds();
	console.log(`Directus: ${missingIds.size} stations without longitude`);

	const updates = [...missingIds]
		.filter((id) => coordinates.has(id))
		.map((id) => ({ id, ...coordinates.get(id) }));
	console.log(`Can be restored: ${updates.length}`);

	let updated = 0;
	for (let index = 0; index < updates.length; index += BATCH_SIZE) {
		const batch = updates.slice(index, index + BATCH_SIZE);
		// Directus обновляет разные записи одним запросом, когда в корне тела лежит массив.
		await request('/items/stations?fields=id', {
			method: 'PATCH',
			body: JSON.stringify(batch),
		});
		updated += batch.length;
		console.log(`Updated ${updated}/${updates.length}`);
	}

	console.log('Done');
};

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
