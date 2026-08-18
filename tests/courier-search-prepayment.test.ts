import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
	COURIER_SEARCH_END,
	COURIER_SEARCH_START,
	getCounterAt,
	getStageText,
} from '../src/components/forms/courierSearchProgress.ts';
import { buildCourierRequestLead } from '../src/lib/leads/courierRequestLead.ts';
import {
	buildLocationLines,
	isLocationReady,
	type RequestLocation,
} from '../src/lib/geo/requestLocation.ts';

const gpsLocation: RequestLocation = {
	source: 'gps',
	city: 'Тюмень',
	address: 'Тюмень, ул. Республики, 1',
	point: { lat: 57.153033, lng: 65.534328, accuracyM: 12.4 },
};

const manualLocation: RequestLocation = {
	source: 'manual',
	city: 'Омск',
	address: 'трасса Р-254, 120 км',
};

test('счётчик поиска идёт от 100 до 30 и не выходит за границы', () => {
	assert.equal(getCounterAt(0, 5000), COURIER_SEARCH_START);
	assert.equal(getCounterAt(2500, 5000), 65);
	assert.equal(getCounterAt(5000, 5000), COURIER_SEARCH_END);
	assert.equal(getCounterAt(99_000, 5000), COURIER_SEARCH_END);
	assert.equal(getCounterAt(-100, 5000), COURIER_SEARCH_START);
});

test('статус сканирования меняется по мере убывания счётчика', () => {
	assert.match(getStageText(100), /радиусе 10 км/);
	assert.match(getStageText(75), /баз партнёров/);
	assert.match(getStageText(55), /экипажей/);
	assert.match(getStageText(30), /сроков поставки/);
});

test('заявка с предоплатой сохраняет контракт вебхука и отмечает приоритет', () => {
	const payload = buildCourierRequestLead({
		subject: 'Голосовая заявка — za-rulem',
		phone: ' 89088712026 ',
		message: 'Нужен бензин АИ-95, 20 литров',
		location: gpsLocation,
		service: 'toplivo',
		queueMode: 'priority',
		prepaymentStatus: 'requested',
	});

	assert.deepEqual(Object.keys(payload).sort(), ['email', 'message', 'phone', 'project', 'subject']);
	assert.equal(payload.project, 'gaztochka');
	assert.equal(payload.phone, '89088712026');
	assert.match(payload.message, /Город: Тюмень/);
	assert.match(payload.message, /Координаты: 57\.153033, 65\.534328/);
	assert.match(payload.message, /Точность: ±12 м/);
	assert.match(payload.message, /Очередь: приоритетная \(предоплата\)/);
	assert.match(payload.message, /Предоплата: запрошена клиентом/);
});

test('заявка без предоплаты помечается общей очередью и ручным местоположением', () => {
	const payload = buildCourierRequestLead({
		subject: '',
		phone: '89088712026',
		message: 'Заглох на трассе',
		location: manualLocation,
		queueMode: 'standard',
		prepaymentStatus: 'skipped',
	});

	assert.equal(payload.subject, 'Заявка — za-rulem');
	assert.match(payload.message, /Город: Омск/);
	assert.match(payload.message, /Адрес: трасса Р-254, 120 км/);
	assert.match(payload.message, /Источник местоположения: указано клиентом вручную/);
	assert.match(payload.message, /Очередь: общая/);
	assert.match(payload.message, /Предоплата: клиент отказался/);
	assert.doesNotMatch(payload.message, /Услуга:/);
});

test('пустой телефон отклоняется до отправки', () => {
	assert.throws(
		() =>
			buildCourierRequestLead({
				subject: 'Тест',
				phone: '   ',
				message: 'Текст',
				location: gpsLocation,
				queueMode: 'standard',
				prepaymentStatus: 'skipped',
			}),
		/phone is required/,
	);
});

test('заявка без определённого местоположения не собирается', () => {
	assert.throws(
		() =>
			buildCourierRequestLead({
				subject: 'Тест',
				phone: '89088712026',
				message: 'Текст',
				location: { source: 'manual', city: 'Омск' },
				queueMode: 'standard',
				prepaymentStatus: 'skipped',
			}),
		/location is required/,
	);
});

test('готовность местоположения проверяет город, адрес и координаты', () => {
	assert.equal(isLocationReady(gpsLocation), true);
	assert.equal(isLocationReady(manualLocation), true);
	assert.equal(isLocationReady(null), false);
	assert.equal(isLocationReady({ source: 'gps', city: 'Омск' }), false);
	assert.equal(
		isLocationReady({ source: 'gps', city: 'Омск', point: { lat: 100, lng: 0, accuracyM: 5 } }),
		false,
	);
	assert.equal(isLocationReady({ source: 'manual', city: '  ', address: 'ул. 1' }), false);
});

test('строки местоположения содержат ссылку на карту для gps-точки', () => {
	const lines = buildLocationLines(gpsLocation);
	assert.ok(lines.some((line) => line.startsWith('Карта: https://yandex.ru/maps/')));
	assert.ok(lines.includes('Источник местоположения: геолокация браузера'));
	assert.equal(buildLocationLines(manualLocation).some((line) => line.startsWith('Карта:')), false);
});
