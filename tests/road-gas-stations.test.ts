import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { parseChatDraft } from '../src/components/driver-chat/lib/chatDraft.ts';
import {
	getRoadBounds,
	getRoadQueryBounds,
	isPointWithinRoadCorridor,
	parseRoadGeometry,
} from '../src/features/road-gas-stations/model/geometry.ts';
import type { RoadGeometry } from '../src/features/road-gas-stations/model/types.ts';
import {
	buildStationActionHref,
	filterStations,
	matchesStationBrand,
	type StationData,
} from '../src/lib/gasStations.ts';

const simpleGeometry: RoadGeometry = {
	type: 'MultiLineString',
	coordinates: [
		[
			[30, 55],
			[31, 55],
		],
	],
};

const station = (brand: string, name = brand): StationData => ({
	station: {
		id: brand,
		region_id: 1,
		name,
		brand,
		address: 'М-5, 100-й километр',
		lat: 55,
		lng: 30,
		last_transaction_at: new Date().toISOString(),
		has_shop: true,
		has_cafe: false,
		has_toilet: true,
		has_car_wash: false,
		pay_card: true,
		pay_cash: true,
		pay_sbp: false,
		fuel_assortment: ['AI_95'],
	},
	fuel_statuses: [],
	prices: [],
	status: 'OPEN',
	closed: false,
	queue_level: 'NONE',
});

test('15 km corridor includes close points and excludes distant points', () => {
	assert.equal(isPointWithinRoadCorridor([30.5, 55.1], simpleGeometry), true);
	assert.equal(isPointWithinRoadCorridor([30.5, 55.2], simpleGeometry), false);
});

test('road bounds include every line', () => {
	assert.deepEqual(getRoadBounds(simpleGeometry), {
		minLat: 55,
		maxLat: 55,
		minLon: 30,
		maxLon: 31,
	});
});

test('every route has valid geometry and API-safe query bounds', async () => {
	const contentDirectory = path.resolve('src/content/routes');
	const geometryDirectory = path.resolve(
		'src/features/road-gas-stations/model/geometries',
	);
	const routeSlugs = (await readdir(contentDirectory))
		.filter((file) => file.endsWith('.md'))
		.map((file) => file.replace(/\.md$/, ''))
		.sort();
	const geometrySlugs = (await readdir(geometryDirectory))
		.filter((file) => file.endsWith('.json'))
		.map((file) => file.replace(/\.json$/, ''))
		.sort();

	assert.deepEqual(geometrySlugs, routeSlugs);
	assert.equal(geometrySlugs.length, 29);

	for (const slug of geometrySlugs) {
		const payload: unknown = JSON.parse(
			await readFile(path.join(geometryDirectory, `${slug}.json`), 'utf8'),
		);
		const geometry = parseRoadGeometry(payload);
		const queryBounds = getRoadQueryBounds(geometry);
		assert.ok(queryBounds.length > 0, `${slug} must have query bounds`);
		for (const bounds of queryBounds) {
			assert.ok(bounds.maxLat - bounds.minLat <= 5, `${slug} latitude span exceeds API limit`);
			assert.ok(bounds.maxLon - bounds.minLon <= 5, `${slug} longitude span exceeds API limit`);
		}
	}
});

test('every route defines three to six unique gas brands', async () => {
	const contentDirectory = path.resolve('src/content/routes');
	const routeFiles = (await readdir(contentDirectory)).filter((file) => file.endsWith('.md'));

	for (const file of routeFiles) {
		const source = await readFile(path.join(contentDirectory, file), 'utf8');
		const gasBrandsBlock = source.match(/gasBrands:\n([\s\S]*?)\nlegacySlugs:/)?.[1] ?? '';
		const names = [...gasBrandsBlock.matchAll(/name: "([^"]+)"/g)].map((match) => match[1]);
		assert.ok(names.length >= 3 && names.length <= 6, `${file} must define 3-6 brands`);
		assert.equal(new Set(names).size, names.length, `${file} brand names must be unique`);
	}
});

test('brand matching is exact and supports configured aliases', () => {
	assert.equal(matchesStationBrand(station('Газпромнефть'), ['Газпром']), false);
	assert.equal(matchesStationBrand(station('НефтеМаркет, заправочная станция'), ['Нефтемаркет']), true);
	assert.equal(matchesStationBrand(station('RusOil'), ['Rusoil']), true);

	const stations = [station('Газпром'), station('Газпромнефть')];
	const filtered = filterStations(stations, {
		searchQuery: '',
		brandAliases: ['Газпром'],
		fuelTypes: [],
		fuelLimit: null,
		onlyCanister: false,
		queue: 'ALL',
	});
	assert.deepEqual(filtered.map((item) => item.station.brand), ['Газпром']);
});

test('station popup action builds a bounded chat draft', () => {
	const item = station('Лукойл', 'Лукойл № 42');
	const href = buildStationActionHref(
		{ href: '/chat?topic=general', label: 'Обсудить', draftContext: 'Трасса М-5' },
		item,
	);
	const url = new URL(href, 'https://za-rulem.org');
	assert.equal(url.pathname, '/chat');
	assert.equal(url.searchParams.get('topic'), 'general');
	assert.match(url.searchParams.get('draft') ?? '', /Лукойл № 42.*М-5/);
	assert.equal(parseChatDraft(`?draft=${'x'.repeat(700)}`).length, 500);
});

test('invalid external geometry is rejected', () => {
	assert.throws(() => parseRoadGeometry({ type: 'LineString', coordinates: [] }));
	assert.throws(() =>
		parseRoadGeometry({ type: 'MultiLineString', coordinates: [[[181, 55], [30, 55]]] }),
	);
});
