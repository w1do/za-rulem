/**
 * HTML-разметка меток заявок для `DG.divIcon`.
 * Метка показывает цену прямо на карте, а класс пульсации задаёт уровень срочности.
 */

import { URGENCY_META } from '../model/constants.ts';
import { findTariff, formatPrice } from '../model/pricing.ts';
import type { MapRequest, UrgencyLevel } from '../model/types.ts';

export interface RequestMarkerMarkup {
	html: string;
	className: string;
	/** Размер иконки в пикселях: [ширина, высота]. */
	size: [number, number];
	/** Точка привязки иконки к координате. */
	anchor: [number, number];
}

const MARKER_WIDTH = 132;
const MARKER_HEIGHT = 64;

const escapeHtml = (value: string): string =>
	value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');

/** Разметка метки заявки: пульсирующее кольцо, иконка услуги и ценник. */
export const buildRequestMarkerMarkup = (request: MapRequest): RequestMarkerMarkup => {
	const urgency = URGENCY_META[request.urgency];
	const tariff = findTariff(request.kind, request.tariffId);

	const html = [
		`<div class="request-pin request-pin--${request.urgency}" style="--pin-color:${urgency.color}">`,
		`<span class="request-pin__wave ${urgency.pulseClass}" aria-hidden="true"></span>`,
		`<span class="request-pin__dot" aria-hidden="true">${tariff?.icon ?? '📍'}</span>`,
		`<span class="request-pin__price">${escapeHtml(formatPrice(request.price))}</span>`,
		'</div>',
	].join('');

	return {
		html,
		className: 'request-pin-icon',
		size: [MARKER_WIDTH, MARKER_HEIGHT],
		anchor: [MARKER_WIDTH / 2, MARKER_HEIGHT - 8],
	};
};

/** Разметка временной метки «здесь буду ждать», которую пользователь ставит кликом. */
export const buildDraftMarkerMarkup = (urgency: UrgencyLevel): RequestMarkerMarkup => {
	const meta = URGENCY_META[urgency];

	return {
		html: [
			`<div class="request-pin request-pin--draft" style="--pin-color:${meta.color}">`,
			'<span class="request-pin__dot" aria-hidden="true">📍</span>',
			'<span class="request-pin__price">Ваша точка</span>',
			'</div>',
		].join(''),
		className: 'request-pin-icon',
		size: [MARKER_WIDTH, MARKER_HEIGHT],
		anchor: [MARKER_WIDTH / 2, MARKER_HEIGHT - 8],
	};
};
