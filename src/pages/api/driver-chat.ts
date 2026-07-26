import type { APIRoute } from 'astro';

export const prerender = false;

type ChatAction = 'join' | 'send' | 'sync';
type ChatTopic = 'general' | 'ai95' | 'ai92' | 'dt' | 'queue';

interface ChatRequest {
	action?: ChatAction;
	phone?: string;
	sessionId?: string;
	topic?: ChatTopic;
	message?: string;
	clientMessageId?: string;
}

const TOPIC_LABELS: Record<ChatTopic, string> = {
	general: 'общему каналу',
	ai95: 'АИ-95',
	ai92: 'АИ-92',
	dt: 'дизелю',
	queue: 'очередям на АЗС',
};

const isTopic = (value: unknown): value is ChatTopic =>
	value === 'general' || value === 'ai95' || value === 'ai92' || value === 'dt' || value === 'queue';

const CHAT_WEBHOOK_URL = import.meta.env.N8N_DRIVER_CHAT_WEBHOOK_URL;

function json(data: unknown, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json; charset=utf-8' },
	});
}

// Ответ на время, пока не подключён боевой вебхук. Чат остаётся рабочим и не пугает ошибкой.
function offlineReply(topic: ChatTopic, clientMessageId?: string) {
	const text = topic === 'general'
		? 'Сообщение принято. Как только кто-то из водителей подскажет, где сейчас есть топливо, ты увидишь ответ прямо здесь.'
		: `Сообщение принято по каналу «${TOPIC_LABELS[topic]}». Как только появится актуальная обстановка, водители ответят прямо здесь.`;
	return {
		id: `system-${clientMessageId ?? Date.now()}`,
		text,
		author: 'system',
		createdAt: new Date().toISOString(),
	};
}

export const POST: APIRoute = async ({ request }) => {
	let body: ChatRequest;

	try {
		body = await request.json();
	} catch {
		return json({ ok: false, error: 'Некорректный формат запроса.' }, 400);
	}

	const phone = body.phone?.replace(/[^\d+]/g, '') ?? '';
	const action = body.action;
	const topic: ChatTopic = isTopic(body.topic) ? body.topic : 'general';

	if (!action || !['join', 'send', 'sync'].includes(action)) {
		return json({ ok: false, error: 'Неизвестное действие.' }, 400);
	}

	if (phone.replace(/\D/g, '').length < 11 || !body.sessionId) {
		return json({ ok: false, error: 'Нужен корректный номер телефона.' }, 400);
	}

	if (action === 'send' && !body.message?.trim()) {
		return json({ ok: false, error: 'Сообщение не может быть пустым.' }, 400);
	}

	// Вебхук не задан: чат работает в демо-режиме и не отдаёт ошибку отправки.
	if (!CHAT_WEBHOOK_URL) {
		if (action === 'send') {
			return json({ ok: true, messages: [offlineReply(topic, body.clientMessageId)] });
		}
		return json({ ok: true, messages: [] });
	}

	try {
		const response = await fetch(CHAT_WEBHOOK_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				project: 'za-rulem',
				channel: 'drivers-fuel',
				action,
				topic,
				phone,
				sessionId: body.sessionId,
				message: body.message?.trim(),
				clientMessageId: body.clientMessageId,
			}),
		});

		const payload = await response.json().catch(() => ({}));
		if (!response.ok) {
			return json({ ok: false, error: 'Не удалось связаться с чатом.' }, 502);
		}

		return json({ ok: true, ...payload });
	} catch {
		return json({ ok: false, error: 'Не удалось связаться с чатом.' }, 502);
	}
};
