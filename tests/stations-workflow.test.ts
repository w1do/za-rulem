import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { canonicalBrandSlug } from '../src/features/gas-prices/model/brandSlug.ts';

/**
 * Код Code-узлов n8n хранится в `scripts/workflow-nodes/*.js` и исполняется
 * платформой как тело async-функции с `$input` и `this.helpers`.
 * Тест повторяет это окружение, чтобы проверить главный инвариант:
 * обновление станции не должно затирать уже известные данные.
 */
const NODE_SOURCE = new URL('../scripts/workflow-nodes/save-snapshots-and-stations.js', import.meta.url);

type Request = { method: string; url: string; body: Record<string, unknown>[] };

const runSaveNode = async (items: Record<string, unknown>[]): Promise<Request[]> => {
	const requests: Request[] = [];
	const helpers = {
		httpRequest: async ({ method, url, body }: Request) => {
			requests.push({ method, url, body });
			return method === 'PATCH' ? { data: body.map((item) => ({ id: item.id })) } : { data: body };
		},
	};
	const input = {
		all: () => items.map((json) => ({ json })),
		first: () => ({ json: items[0] }),
	};
	const code = readFileSync(NODE_SOURCE, 'utf8');
	const node = new Function('$input', `return (async () => {${code}})();`);
	await node.call({ helpers }, input);
	return requests;
};

const area = { type: 'city', slug: 'syktyvkar', parent: null };
const config = { directusUrl: 'https://directus.test', directusToken: 'token', area };

const station = (overrides: Record<string, unknown> = {}) => ({
	station: {
		id: '10133627442561458',
		name: 'Лукойл',
		brand: 'Лукойл',
		address: 'Сыктывкар, местечко Дырнос, 141',
		lat: 61.67954,
		lng: 50.780113,
		timezone_offset: 3,
		fuel_assortment: ['AI_95'],
		...overrides,
	},
	prices: [{ fuel_type: 'AI_95', price: 60.5, updated_at: '2026-08-15T10:00:00Z' }],
	fuel_statuses: [{ fuel_type: 'AI_95', queue_level: 'NONE' }],
	updated_at: '2026-08-15T10:00:00Z',
	status: 'open',
});

const stationPayload = (requests: Request[]): Record<string, unknown> => {
	const patch = requests.find((request) => request.method === 'PATCH' && request.url.endsWith('/items/stations'));
	assert.ok(patch, 'станции должны обновляться отдельным PATCH');
	return patch.body[0];
};

test('координаты станции сохраняются как числа, бренд — английским slug', async () => {
	const requests = await runSaveNode([{ ...config, stations: [station()], snapshots: [] }]);
	const payload = stationPayload(requests);

	assert.equal(payload.lat, 61.67954);
	assert.equal(payload.lng, 50.780113);
	assert.equal(payload.brand, 'lukoil');
});

test('пустые поля источника не попадают в запрос и не затирают данные Directus', async () => {
	const requests = await runSaveNode([
		{ ...config, stations: [station({ lng: null, address: '', fuel_assortment: [] })], snapshots: [] },
	]);
	const payload = stationPayload(requests);

	assert.equal('lng' in payload, false);
	assert.equal('address' in payload, false);
	assert.equal('fuel_assortment' in payload, false);
	assert.equal(payload.lat, 61.67954);
});

test('slug появляется только при создании записи и остаётся латинским', async () => {
	const requests: Request[] = [];
	const helpers = {
		httpRequest: async ({ method, url, body }: Request) => {
			requests.push({ method, url, body });
			return { data: method === 'PATCH' ? [] : body };
		},
	};
	const items = [{ ...config, stations: [station()], snapshots: [] }];
	const code = readFileSync(NODE_SOURCE, 'utf8');
	const node = new Function('$input', `return (async () => {${code}})();`);
	await node.call({ helpers }, { all: () => items.map((json) => ({ json })), first: () => ({ json: items[0] }) });

	const patch = requests.find((request) => request.method === 'PATCH' && request.url.endsWith('/items/stations'));
	const post = requests.find((request) => request.method === 'POST' && request.url.endsWith('/items/stations'));
	assert.equal('slug' in (patch?.body[0] ?? {}), false);
	assert.match(String(post?.body[0].slug), /^[a-z0-9-]+$/);
});

test('канонизация бренда убирает родовые слова и даёт английское написание', () => {
	assert.equal(canonicalBrandSlug('Лукойл, заправочная станция'), 'lukoil');
	assert.equal(canonicalBrandSlug('Газпромнефть'), 'gazpromneft');
	assert.equal(canonicalBrandSlug('Роснефть'), 'rosneft');
	assert.equal(canonicalBrandSlug('Калина-Ойл'), 'kalina-oil');
	assert.equal(canonicalBrandSlug('АЗС'), '');
	assert.equal(canonicalBrandSlug('lukoil'), 'lukoil');
});
