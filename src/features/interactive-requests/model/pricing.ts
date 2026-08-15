/**
 * Расчёт стоимости интерактивной заявки.
 * Итоговая цена — базовый тариф плюс наценка за срочность (+80% / +65% / +30%).
 */

import { TARIFFS_BY_KIND, URGENCY_META } from './constants.ts';
import type {
	RequestKind,
	RequestPrice,
	RequestTariff,
	UrgencyLevel,
} from './types.ts';

/** Находит тариф по виду заявки и идентификатору позиции прайса. */
export const findTariff = (
	kind: RequestKind,
	tariffId: string,
): RequestTariff | null =>
	TARIFFS_BY_KIND[kind].find((tariff) => tariff.id === tariffId) ?? null;

/** Применяет наценку срочности к произвольной базовой цене. */
export const applyUrgencyMarkup = (
	basePrice: number,
	urgency: UrgencyLevel,
): number => {
	const { markupPercent } = URGENCY_META[urgency];
	return Math.round(basePrice * (1 + markupPercent / 100));
};

/**
 * Полный расчёт стоимости заявки.
 * Возвращает `null`, если тариф не найден — вызывающий код обязан обработать этот случай.
 */
export const calculateRequestPrice = (
	kind: RequestKind,
	tariffId: string,
	urgency: UrgencyLevel,
): RequestPrice | null => {
	const tariff = findTariff(kind, tariffId);
	if (!tariff) return null;

	const { markupPercent } = URGENCY_META[urgency];

	return {
		basePrice: tariff.basePrice,
		markupPercent,
		totalPrice: applyUrgencyMarkup(tariff.basePrice, urgency),
	};
};

/** Минимальная цена позиции прайса — при самой низкой наценке (+30%). */
export const getMinimalPrice = (tariff: RequestTariff): number =>
	applyUrgencyMarkup(tariff.basePrice, 'green');

/** Форматирует цену в рублях с неразрывными пробелами: `6 840 ₽`. */
export const formatPrice = (price: number): string =>
	`${price.toLocaleString('ru-RU').replace(/\s/g, '\u00a0')}\u00a0₽`;
