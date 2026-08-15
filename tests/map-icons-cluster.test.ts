import test from 'node:test';
import assert from 'node:assert/strict';

import {
	buildStationMarkerIconOptions,
	buildStationMarkerSvg,
	getQueueCategoryColor,
	getStationQueueCategory,
	resolveQueueColorCategory,
} from '../src/components/maps/markerIcons.ts';
import {
	buildClusterIconMarkup,
	buildClusterRingGradient,
	formatClusterCount,
	resolveClusterSizeName,
} from '../src/components/maps/clusterIcon.ts';
import type { StationData } from '../src/lib/gasStations.ts';

const station = (queueLevel: string, closed = false): StationData =>
	({
		station: {
			id: 'station-1',
			name: 'АЗС',
			brand: 'Тест',
			address: 'ул. Тестовая, 1',
			lat: 57.15,
			lng: 65.53,
		},
		fuel_statuses: [],
		prices: [],
		status: 'OK',
		closed,
		queue_level: queueLevel,
	}) as unknown as StationData;

test('queue levels are mapped to marker colors', () => {
	assert.equal(resolveQueueColorCategory('NONE'), 'green');
	assert.equal(resolveQueueColorCategory('UP_TO_25'), 'orange');
	assert.equal(resolveQueueColorCategory('FROM_10_TO_25'), 'orange');
	assert.equal(resolveQueueColorCategory('FROM_25_TO_50'), 'orange');
	assert.equal(resolveQueueColorCategory('OVER_50'), 'red');
	assert.equal(resolveQueueColorCategory('UNKNOWN'), 'neutral');
	assert.equal(resolveQueueColorCategory(undefined), 'neutral');
});

test('closed station is always neutral regardless of queue level', () => {
	assert.equal(resolveQueueColorCategory('NONE', true), 'neutral');
	assert.equal(getStationQueueCategory(station('NONE', true)), 'neutral');
});

test('station category is taken from the station snapshot', () => {
	assert.equal(getStationQueueCategory(station('OVER_50')), 'red');
	assert.equal(getStationQueueCategory(station('none')), 'green');
});

test('marker svg uses the color of the resolved category', () => {
	assert.ok(buildStationMarkerSvg('green').includes(getQueueCategoryColor('green')));
	assert.ok(buildStationMarkerSvg('red').includes(getQueueCategoryColor('red')));
	assert.ok(!buildStationMarkerSvg('green').includes(getQueueCategoryColor('red')));
});

test('marker icon options carry an inline svg data url and stable anchors', () => {
	const options = buildStationMarkerIconOptions(station('FROM_25_TO_50'));

	assert.ok(options.iconUrl.startsWith('data:image/svg+xml;charset=UTF-8,'));
	assert.ok(decodeURIComponent(options.iconUrl).includes(getQueueCategoryColor('orange')));
	assert.deepEqual(options.iconSize, [40, 50]);
	assert.deepEqual(options.iconAnchor, [20, 50]);
});

test('cluster size grows with the number of stations', () => {
	assert.equal(resolveClusterSizeName(3), 'small');
	assert.equal(resolveClusterSizeName(20), 'medium');
	assert.equal(resolveClusterSizeName(120), 'large');
});

test('cluster markup contains the station count', () => {
	const markup = buildClusterIconMarkup(20);

	assert.ok(markup.html.includes('20'));
	assert.equal(markup.className, 'gas-cluster gas-cluster--medium');
	assert.deepEqual(markup.size, [50, 50]);
	assert.equal(formatClusterCount(250), '99+');
	assert.equal(buildClusterIconMarkup(-5).html.includes('0'), true);
});

test('cluster ring is a single color when all stations share the queue level', () => {
	assert.equal(buildClusterRingGradient({ green: 4 }), getQueueCategoryColor('green'));
	assert.equal(buildClusterRingGradient({}), '#F5B754');
});

test('cluster ring splits into segments proportional to the queue breakdown', () => {
	const gradient = buildClusterRingGradient({ green: 2, red: 1 });

	assert.ok(gradient.startsWith('conic-gradient(from -90deg, '));
	assert.ok(gradient.includes(`${getQueueCategoryColor('green')} 0.00deg 240.00deg`));
	assert.ok(gradient.includes(`${getQueueCategoryColor('red')} 240.00deg 360.00deg`));
});

test('cluster markup renders the ring and the count separately', () => {
	const markup = buildClusterIconMarkup(3, { green: 2, red: 1 });

	assert.ok(markup.html.includes('gas-cluster__ring'));
	assert.ok(markup.html.includes('gas-cluster__inner'));
	assert.ok(markup.html.includes(getQueueCategoryColor('red')));
	assert.ok(markup.html.includes('>3<'));
});
