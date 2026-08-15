/**
 * Контракты интерактивных заявок на карте: очередь на АЗС и автопомощь на дороге.
 * Единый источник правды для расчёта цены, отрисовки меток и отправки лида.
 */

/** Уровень срочности заявки: определяет наценку и характер пульсации метки. */
export type UrgencyLevel = 'red' | 'yellow' | 'green';

/** Вид заявки: очередь на заправку или выездная автопомощь. */
export type RequestKind = 'queue' | 'assistance';

/** Идентификатор тарифа очереди — максимальное время ожидания в часах. */
export type QueueDurationId = '3' | '5' | '8';

/** Идентификатор услуги автопомощи. */
export type AssistanceServiceId =
	| 'tow'
	| 'battery'
	| 'engine-repair'
	| 'fuel-delivery'
	| 'warmup'
	| 'winch'
	| 'wheel'
	| 'unlock';

/** Описание уровня срочности для UI и расчёта. */
export interface UrgencyMeta {
	id: UrgencyLevel;
	/** Короткая подпись: «Срочно», «Может подождать», «Не к спеху». */
	label: string;
	/** Пояснение для пользователя. */
	hint: string;
	/** Наценка к базовому тарифу в процентах. */
	markupPercent: number;
	/** Основной цвет метки и бейджа. */
	color: string;
	/** CSS-класс пульсации метки на карте. */
	pulseClass: string;
}

/** Тариф — базовая позиция прайса (длительность очереди либо услуга автопомощи). */
export interface RequestTariff {
	id: string;
	kind: RequestKind;
	/** Название позиции для селектора и карточки. */
	label: string;
	/** Короткое пояснение. */
	hint: string;
	/** Базовая цена без наценки за срочность, ₽. */
	basePrice: number;
	/** Эмодзи-иконка для метки на карте. */
	icon: string;
}

/** Результат расчёта стоимости заявки. */
export interface RequestPrice {
	basePrice: number;
	markupPercent: number;
	/** Итоговая цена с наценкой, ₽. */
	totalPrice: number;
}

/** Заявка, отображаемая на карте. */
export interface MapRequest {
	id: string;
	kind: RequestKind;
	/** Идентификатор тарифа: `QueueDurationId` или `AssistanceServiceId`. */
	tariffId: string;
	urgency: UrgencyLevel;
	lat: number;
	lng: number;
	/** Итоговая цена с наценкой, ₽. */
	price: number;
	phone: string;
	/** Комментарий водителя: марка авто, колонка, ориентир. */
	message: string;
	/** Метка времени создания, ms. */
	createdAt: number;
}

/**
 * АЗС города для подложки карты заявок.
 * Минимальный срез `StationData`: на карте нужны только позиция, подпись и цвет очереди.
 */
export interface MapStation {
	id: string;
	name: string;
	brand: string;
	address: string;
	lat: number;
	lng: number;
	/** Уровень очереди из снимков `gas_daily` — задаёт цвет пина. */
	queueLevel: string;
	/** АЗС закрыта: пин показывается серым. */
	closed: boolean;
}

/** Данные формы создания заявки. */
export interface CreateRequestInput {
	kind: RequestKind;
	tariffId: string;
	urgency: UrgencyLevel;
	lat: number;
	lng: number;
	phone: string;
	message: string;
}

/** Ошибки валидации формы по именам полей. */
export type RequestValidationErrors = Partial<
	Record<'phone' | 'message' | 'point' | 'tariffId', string>
>;
