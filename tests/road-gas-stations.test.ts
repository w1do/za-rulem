import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import {
	getRoadBounds,
	getRoadQueryBounds,
	isPointWithinRoadCorridor,
	parseRoadGeometry,
} from '../src/features/road-gas-stations/model/geometry.ts';
import type { RoadGeometry } from '../src/features/road-gas-stations/model/types.ts';

const simpleGeometry: RoadGeometry = {
	type: 'MultiLineString',
	coordinates: [
		[
			[30, 55],
			[31, 55],
		],
	],
};

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

test('invalid external geometry is rejected', () => {
	assert.throws(() => parseRoadGeometry({ type: 'LineString', coordinates: [] }));
	assert.throws(() =>
		parseRoadGeometry({ type: 'MultiLineString', coordinates: [[[181, 55], [30, 55]]] }),
	);
});
