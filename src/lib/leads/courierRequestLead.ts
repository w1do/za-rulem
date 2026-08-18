import { buildLocationLines, isLocationReady, type RequestLocation } from '../geo/requestLocation.ts';

export const LEADS_ENDPOINT = 'https://n8n.w1do.ru/webhook/requests';

export type QueueMode = 'standard' | 'priority';

export type PrepaymentStatus = 'requested' | 'skipped';

export type CourierRequestLeadInput = {
	subject: string;
	phone: string;
	message: string;
	location: RequestLocation;
	service?: string;
	queueMode: QueueMode;
	prepaymentStatus: PrepaymentStatus;
};

export type CourierRequestLeadPayload = {
	email: string;
	subject: string;
	phone: string;
	message: string;
	project: 'gaztochka';
};

const FALLBACK_EMAIL = 'noreply@za-rulem.org';

/**
 * Собирает тело заявки для единого вебхука n8n.
 * Контракт вебхука фиксирован: email, subject, phone, message, project.
 * Местоположение (город, адрес, координаты), режим очереди и намерение предоплаты
 * добавляются в текст сообщения.
 */
export function buildCourierRequestLead(input: CourierRequestLeadInput): CourierRequestLeadPayload {
	const phone = input.phone.trim();
	const message = input.message.trim();

	if (!phone) throw new Error('phone is required');
	if (!message) throw new Error('message is required');
	if (!isLocationReady(input.location)) throw new Error('location is required');

	const details = [
		...buildLocationLines(input.location),
		input.service ? `Услуга: ${input.service}` : null,
		`Очередь: ${input.queueMode === 'priority' ? 'приоритетная (предоплата)' : 'общая'}`,
		`Предоплата: ${input.prepaymentStatus === 'requested' ? 'запрошена клиентом' : 'клиент отказался'}`,
	].filter((line): line is string => line !== null);

	return {
		email: FALLBACK_EMAIL,
		subject: input.subject.trim() || 'Заявка — za-rulem',
		phone,
		message: [message, '', ...details].join('\n'),
		project: 'gaztochka',
	};
}
