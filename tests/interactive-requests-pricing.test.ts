import test from 'node:test';
import assert from 'node:assert/strict';

import {
	ASSISTANCE_TARIFFS,
	QUEUE_TARIFFS,
	URGENCY_META,
} from '../src/features/interactive-requests/model/constants.ts';
import {
	applyUrgencyMarkup,
	calculateRequestPrice,
	findTariff,
	formatPrice,
} from '../src/features/interactive-requests/model/pricing.ts';
import { buildQueueAnalytics } from '../src/features/interactive-requests/model/queueAnalytics.ts';
import { toMapStations } from '../src/features/interactive-requests/model/mapStations.ts';
import {
	buildMapRequest,
	isValidPhone,
	normalizePhone,
	validateRequest,
} from '../src/features/interactive-requests/model/submitRequest.ts';
import {
	dropExpiredRequests,
	mergeRequests,
	parseStoredRequests,
	sortRequests,
} from '../src/features/interactive-requests/model/requestStorage.ts';
import { buildRequestMarkerMarkup } from '../src/features/interactive-requests/ui/RequestMapMarkers.ts';
import type {
	CreateRequestInput,
	MapRequest,
} from '../src/features/interactive-requests/model/types.ts';

const NOW = Date.parse('2026-08-15T12:00:00.000Z');

const priceOf = (kind: 'queue' | 'assistance', tariffId: string, urgency: 'red' | 'yellow' | 'green') => {
	const price = calculateRequestPrice(kind, tariffId, urgency);
	assert.ok(price, `Тариф ${kind}/${tariffId} должен существовать`);
	return price.totalPrice;
};

test('наценки срочности соответствуют согласованным процентам', () => {
	assert.equal(URGENCY_META.red.markupPercent, 80);
	assert.equal(URGENCY_META.yellow.markupPercent, 65);
	assert.equal(URGENCY_META.green.markupPercent, 30);
});

test('базовые тарифы очереди на АЗС: 3800 / 4100 / 4900 ₽', () => {
	assert.deepEqual(
		QUEUE_TARIFFS.map((tariff) => [tariff.id, tariff.basePrice]),
		[
			['3', 3800],
			['5', 4100],
			['8', 4900],
		],
	);
});

test('расчёт стоимости очереди по всем уровням срочности', () => {
	assert.equal(priceOf('queue', '3', 'green'), 4940);
	assert.equal(priceOf('queue', '3', 'yellow'), 6270);
	assert.equal(priceOf('queue', '3', 'red'), 6840);

	assert.equal(priceOf('queue', '5', 'green'), 5330);
	assert.equal(priceOf('queue', '5', 'yellow'), 6765);
	assert.equal(priceOf('queue', '5', 'red'), 7380);

	assert.equal(priceOf('queue', '8', 'green'), 6370);
	assert.equal(priceOf('queue', '8', 'yellow'), 8085);
	assert.equal(priceOf('queue', '8', 'red'), 8820);
});

test('расчёт стоимости автопомощи по всем уровням срочности', () => {
	assert.equal(priceOf('assistance', 'tow', 'green'), 4550);
	assert.equal(priceOf('assistance', 'tow', 'yellow'), 5775);
	assert.equal(priceOf('assistance', 'tow', 'red'), 6300);

	assert.equal(priceOf('assistance', 'engine-repair', 'green'), 6500);
	assert.equal(priceOf('assistance', 'engine-repair', 'yellow'), 8250);
	assert.equal(priceOf('assistance', 'engine-repair', 'red'), 9000);
});

test('каталог автопомощи содержит все основные выездные услуги', () => {
	assert.deepEqual(
		ASSISTANCE_TARIFFS.map((tariff) => tariff.id),
		['tow', 'battery', 'engine-repair', 'fuel-delivery', 'warmup', 'winch', 'wheel', 'unlock'],
	);
	assert.ok(ASSISTANCE_TARIFFS.every((tariff) => tariff.basePrice > 0));
});

test('цена округляется до целых рублей', () => {
	assert.equal(applyUrgencyMarkup(2555, 'yellow'), 4216);
	assert.equal(Number.isInteger(applyUrgencyMarkup(3333, 'green')), true);
});

test('неизвестный тариф не даёт расчёта', () => {
	assert.equal(findTariff('queue', '12'), null);
	assert.equal(calculateRequestPrice('assistance', 'teleport', 'red'), null);
});

test('форматирование цены использует неразрывные пробелы', () => {
	assert.equal(formatPrice(6840), '6\u00a0840\u00a0₽');
});

test('валидация заявки ловит пустой телефон, короткое сообщение и точку', () => {
	const input: CreateRequestInput = {
		kind: 'queue',
		tariffId: '3',
		urgency: 'red',
		lat: Number.NaN,
		lng: Number.NaN,
		phone: '123',
		message: 'ok',
	};

	const errors = validateRequest(input);
	assert.ok(errors.phone);
	assert.ok(errors.message);
	assert.ok(errors.point);
	assert.equal(errors.tariffId, undefined);
});

test('корректная заявка проходит валидацию и получает цену с наценкой', () => {
	const input: CreateRequestInput = {
		kind: 'assistance',
		tariffId: 'battery',
		urgency: 'yellow',
		lat: 57.15,
		lng: 65.53,
		phone: '+7 (908) 871-20-26',
		message: 'Сел аккумулятор возле дома, нужна помощь.',
	};

	assert.deepEqual(validateRequest(input), {});

	const request = buildMapRequest(input, NOW);
	assert.ok(request);
	assert.equal(request.price, 4950);
	assert.equal(request.createdAt, NOW);
});

test('телефон нормализуется до цифр', () => {
	assert.equal(normalizePhone('+7 (908) 871-20-26'), '79088712026');
	assert.equal(isValidPhone('89088712026'), true);
	assert.equal(isValidPhone('8908'), false);
});

test('устаревшие заявки не попадают на карту', () => {
	const fresh = { id: 'a', createdAt: NOW - 60_000 } as MapRequest;
	const stale = { id: 'b', createdAt: NOW - 8 * 60 * 60 * 1000 } as MapRequest;

	assert.deepEqual(
		dropExpiredRequests([fresh, stale], NOW).map((request) => request.id),
		['a'],
	);
});

test('заявки сортируются от срочных к спокойным', () => {
	const make = (id: string, urgency: MapRequest['urgency'], createdAt: number) =>
		({ id, urgency, createdAt }) as MapRequest;

	const sorted = sortRequests([
		make('green', 'green', NOW),
		make('red', 'red', NOW - 1000),
		make('yellow', 'yellow', NOW),
	]);

	assert.deepEqual(
		sorted.map((request) => request.id),
		['red', 'yellow', 'green'],
	);
});

test('битое содержимое localStorage не ломает карту', () => {
	assert.deepEqual(parseStoredRequests(null), []);
	assert.deepEqual(parseStoredRequests('{not json'), []);
	assert.deepEqual(parseStoredRequests('[{"id":"x"}]'), []);
});

test('метка на карте показывает цену и класс пульсации по срочности', () => {
	const build = (urgency: MapRequest['urgency'], price: number) =>
		buildRequestMarkerMarkup({
			id: 'x',
			kind: 'assistance',
			tariffId: 'tow',
			urgency,
			lat: 57.15,
			lng: 65.53,
			price,
			phone: '89088712026',
			message: 'Нужен буксир',
			createdAt: NOW,
		});

	const red = build('red', 6300);
	assert.match(red.html, /pulse-urgent-red/);
	assert.match(red.html, /6\u00a0300\u00a0₽/);
	assert.match(red.html, /request-pin--red/);

	assert.match(build('yellow', 5775).html, /pulse-medium-yellow/);
	assert.match(build('green', 4550).html, /pulse-subtle-green/);
});

test('станции города приводятся к меткам карты и отбрасывают битые координаты', () => {
	const build = (id: string, lat: unknown, lng: unknown) => ({
		station: {
			id,
			region_id: 1,
			name: `АЗС ${id}`,
			brand: 'Роснефть',
			address: 'ул. Ленина, 1',
			lat,
			lng,
			last_transaction_at: '2026-01-01T00:00:00Z',
			has_shop: false,
			has_cafe: false,
			has_toilet: false,
			has_car_wash: false,
			pay_card: true,
			pay_cash: true,
			pay_sbp: true,
			fuel_assortment: [],
		},
		fuel_statuses: [],
		prices: [],
		status: 'OPEN',
		closed: false,
		queue_level: 'SMALL',
	});

	const stations = toMapStations([
		build('1', 52.28, 104.28),
		build('2', Number.NaN, 104.3),
	] as never);

	assert.equal(stations.length, 1);
	assert.deepEqual(stations[0], {
		id: '1',
		name: 'АЗС 1',
		brand: 'Роснефть',
		address: 'ул. Ленина, 1',
		lat: 52.28,
		lng: 104.28,
		queueLevel: 'SMALL',
		closed: false,
	});
});

test('аналитика очередей считает обстановку и подбирает спокойные и загруженные АЗС', () => {
	const station = (id: string, queueLevel: string, closed = false) => ({
		id,
		name: `АЗС ${id}`,
		brand: 'Роснефть',
		address: `ул. Ленина, ${id}`,
		lat: 52.28,
		lng: 104.28,
		queueLevel,
		closed,
	});

	const analytics = buildQueueAnalytics([
		station('1', 'NONE'),
		station('2', 'UP_TO_25'),
		station('3', 'OVER_50'),
		station('4', 'OVER_50'),
		station('5', '', true),
	]);

	assert.equal(analytics.total, 5);
	assert.equal(analytics.free, 1);
	assert.equal(analytics.small, 1);
	assert.equal(analytics.large, 2);
	assert.equal(analytics.closed, 1);
	assert.equal(analytics.busyShare, 50);
	assert.equal(analytics.tone, 'busy');
	assert.deepEqual(
		analytics.calmStations.map((item) => item.id),
		['1'],
	);
	assert.deepEqual(
		analytics.busyStations.map((item) => item.id),
		['3', '4'],
	);
	assert.equal(analytics.windows.length, 6);
});

test('без данных по очередям аналитика не выдумывает загрузку', () => {
	const analytics = buildQueueAnalytics([]);

	assert.equal(analytics.busyShare, 0);
	assert.equal(analytics.tone, 'calm');
	assert.match(analytics.verdict, /Свежих данных/);
	assert.deepEqual(analytics.calmStations, []);
});
