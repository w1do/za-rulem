/**
 * Валидация формы заявки и отправка лида в единый вебхук n8n.
 * Тело запроса строго соответствует контракту проекта: email/subject/phone/message/project.
 */

import { REQUESTS_ENDPOINT, REQUESTS_PROJECT, URGENCY_META } from './constants.ts';
import { calculateRequestPrice, findTariff, formatPrice } from './pricing.ts';
import type {
	CreateRequestInput,
	MapRequest,
	RequestValidationErrors,
} from './types.ts';

const PHONE_DIGITS_MIN = 10;

/** Оставляет в номере только цифры — для проверки длины и передачи в вебхук. */
export const normalizePhone = (phone: string): string => phone.replace(/\D/g, '');

/** Проверяет, что номер похож на российский мобильный. */
export const isValidPhone = (phone: string): boolean =>
	normalizePhone(phone).length >= PHONE_DIGITS_MIN;

/** Проверяет форму заявки перед отправкой. Пустой объект — ошибок нет. */
export const validateRequest = (
	input: CreateRequestInput,
): RequestValidationErrors => {
	const errors: RequestValidationErrors = {};

	if (!findTariff(input.kind, input.tariffId)) {
		errors.tariffId = 'Выберите услугу из списка.';
	}

	if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng)) {
		errors.point = 'Отметьте точку на карте, чтобы вас нашли.';
	}

	if (!isValidPhone(input.phone)) {
		errors.phone = 'Укажите номер телефона для связи.';
	}

	if (input.message.trim().length < 5) {
		errors.message = 'Опишите ситуацию: марка авто, колонка, ориентир.';
	}

	return errors;
};

/** Собирает заявку карты из проверенного ввода. */
export const buildMapRequest = (
	input: CreateRequestInput,
	now = Date.now(),
): MapRequest | null => {
	const price = calculateRequestPrice(input.kind, input.tariffId, input.urgency);
	if (!price) return null;

	return {
		id: `req-${now}-${Math.random().toString(36).slice(2, 8)}`,
		kind: input.kind,
		tariffId: input.tariffId,
		urgency: input.urgency,
		lat: input.lat,
		lng: input.lng,
		price: price.totalPrice,
		phone: input.phone.trim(),
		message: input.message.trim(),
		createdAt: now,
	};
};

/** Тема письма для вебхука: вид заявки, тариф и срочность. */
const buildSubject = (request: MapRequest): string => {
	const tariff = findTariff(request.kind, request.tariffId);
	const kindLabel = request.kind === 'queue' ? 'Очередь на АЗС' : 'Автопомощь';
	return `${kindLabel}: ${tariff?.label ?? request.tariffId} — ${URGENCY_META[request.urgency].label}`;
};

/** Текст сообщения: комментарий водителя плюс цена и координаты метки. */
const buildMessage = (request: MapRequest): string =>
	[
		request.message,
		`Стоимость: ${formatPrice(request.price)} (срочность +${URGENCY_META[request.urgency].markupPercent}%)`,
		`Точка на карте: ${request.lat.toFixed(6)}, ${request.lng.toFixed(6)}`,
	].join('\n');

/**
 * Отправляет заявку в вебхук.
 * Бросает ошибку при сетевом сбое или неуспешном HTTP-статусе,
 * чтобы UI не показал успех при неудачной доставке.
 */
export const sendRequestToWebhook = async (
	request: MapRequest,
	signal?: AbortSignal,
): Promise<void> => {
	const response = await fetch(REQUESTS_ENDPOINT, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		signal,
		body: JSON.stringify({
			email: 'no-email@gaztochka.ru',
			subject: buildSubject(request),
			phone: normalizePhone(request.phone),
			message: buildMessage(request),
			project: REQUESTS_PROJECT,
		}),
	});

	if (!response.ok) {
		throw new Error(`Webhook responded with HTTP ${response.status}`);
	}
};
