import { useCallback, useEffect, useRef, useState } from 'react';

// Тема (канал) чата. Общий канал + топливо по маркам и очереди на АЗС.
export type ChatTopic = 'general' | 'ai95' | 'ai92' | 'dt' | 'queue';

export interface ChatMessage {
	id: string;
	text: string;
	author: 'me' | 'driver' | 'system';
	createdAt: string;
	status?: 'sending' | 'sent' | 'error';
}

interface WebhookMessage {
	id?: string | number;
	text?: string;
	message?: string;
	author?: string;
	phone?: string;
	createdAt?: string;
	timestamp?: string;
}

const STORAGE_KEY = 'za-rulem-driver-chat';

const welcomeMessage: ChatMessage = {
	id: 'welcome',
	text: 'Чат открыт. Напиши, где сейчас есть топливо или что ищешь: район, АЗС, марку — АИ-92, АИ-95 или ДТ. Здесь водители подсказывают друг другу актуальную обстановку.',
	author: 'system',
	createdAt: new Date().toISOString(),
};

const isTopic = (value: unknown): value is ChatTopic =>
	value === 'general' || value === 'ai95' || value === 'ai92' || value === 'dt' || value === 'queue';

// Безопасная генерация id: crypto.randomUUID доступен не во всех окружениях (например, http по IP).
const createId = () => {
	try {
		if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
			return crypto.randomUUID();
		}
	} catch {
		// падение недоступного crypto не должно ломать чат
	}
	return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const normalizePhone = (value: string) => {
	const digits = value.replace(/\D/g, '').slice(0, 11);
	if (!digits) return '';
	const normalized = digits[0] === '8' ? `7${digits.slice(1)}` : digits;
	return `+${normalized}`;
};

function getMessages(payload: Record<string, unknown>, ownPhone: string): ChatMessage[] {
	const data = payload.data as Record<string, unknown> | undefined;
	const raw = payload.messages ?? data?.messages ?? (payload.reply ? [{ text: payload.reply }] : []);
	if (!Array.isArray(raw)) return [];

	return raw.flatMap((item, index) => {
		const message = item as WebhookMessage;
		const text = message.text ?? message.message;
		if (!text) return [];
		const author = message.author === 'me' || message.phone === ownPhone
			? 'me'
			: message.author === 'system'
				? 'system'
				: 'driver';
		return [{
			id: String(message.id ?? `${message.timestamp ?? Date.now()}-${index}`),
			text,
			author,
			createdAt: message.createdAt ?? message.timestamp ?? new Date().toISOString(),
			status: 'sent',
		} satisfies ChatMessage];
	});
}

export function useDriverChat() {
	const [phone, setPhone] = useState('');
	const [sessionId, setSessionId] = useState('');
	const [topic, setTopic] = useState<ChatTopic>('general');
	const [isJoined, setIsJoined] = useState(false);
	const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
	const [error, setError] = useState('');
	const phoneRef = useRef(phone);
	phoneRef.current = phone;
	const topicRef = useRef(topic);
	topicRef.current = topic;

	const mergeMessages = useCallback((incoming: ChatMessage[]) => {
		if (!incoming.length) return;
		setMessages((current) => {
			const ids = new Set(current.map((message) => message.id));
			return [...current, ...incoming.filter((message) => !ids.has(message.id))];
		});
	}, []);

	const request = useCallback(async (action: 'join' | 'send' | 'sync', extra: Record<string, unknown> = {}) => {
		const response = await fetch('/api/driver-chat', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action, phone: phoneRef.current, sessionId, topic: topicRef.current, ...extra }),
		});
		const payload = (await response.json().catch(() => ({}))) as Record<string, unknown> & { error?: string };
		if (!response.ok) throw new Error(payload.error ?? 'Чат пока не отвечает.');
		mergeMessages(getMessages(payload, phoneRef.current));
	}, [mergeMessages, sessionId]);

	useEffect(() => {
		const saved = window.localStorage.getItem(STORAGE_KEY);
		if (!saved) return;
		try {
			const data = JSON.parse(saved) as { phone?: string; sessionId?: string; topic?: unknown };
			if (data.phone && data.sessionId) {
				setPhone(data.phone);
				setSessionId(data.sessionId);
				if (isTopic(data.topic)) setTopic(data.topic);
				setIsJoined(true);
			}
		} catch {
			window.localStorage.removeItem(STORAGE_KEY);
		}
	}, []);

	useEffect(() => {
		if (!isJoined || !sessionId) return;
		const sync = () => request('sync').catch(() => undefined);
		sync();
		const timer = window.setInterval(sync, 5000);
		return () => window.clearInterval(timer);
	}, [isJoined, request, sessionId]);

	const persist = (nextPhone: string, nextSessionId: string, nextTopic: ChatTopic) => {
		window.localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({ phone: nextPhone, sessionId: nextSessionId, topic: nextTopic }),
		);
	};

	const changeTopic = (nextTopic: ChatTopic) => {
		topicRef.current = nextTopic;
		setTopic(nextTopic);
		if (isJoined && sessionId) persist(phoneRef.current, sessionId, nextTopic);
	};

	const join = (rawPhone: string) => {
		const nextPhone = normalizePhone(rawPhone);
		if (nextPhone.replace(/\D/g, '').length !== 11) {
			setError('Укажи номер из 11 цифр.');
			return false;
		}
		const nextSessionId = createId();
		phoneRef.current = nextPhone;
		setPhone(nextPhone);
		setSessionId(nextSessionId);
		setIsJoined(true);
		setError('');
		persist(nextPhone, nextSessionId, topicRef.current);
		fetch('/api/driver-chat', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ action: 'join', phone: nextPhone, sessionId: nextSessionId, topic: topicRef.current }),
		}).catch(() => undefined);
		return true;
	};

	const send = async (text: string) => {
		const value = text.trim();
		if (!value) return false;
		const id = createId();
		const outgoing: ChatMessage = {
			id,
			text: value,
			author: 'me',
			createdAt: new Date().toISOString(),
			status: 'sending',
		};
		setMessages((current) => [...current, outgoing]);
		setError('');
		try {
			await request('send', { message: value, clientMessageId: id });
			setMessages((current) => current.map((message) => message.id === id ? { ...message, status: 'sent' } : message));
			return true;
		} catch (sendError) {
			setMessages((current) => current.map((message) => message.id === id ? { ...message, status: 'error' } : message));
			setError(sendError instanceof Error ? sendError.message : 'Сообщение не отправлено. Попробуй ещё раз.');
			return false;
		}
	};

	return { phone, topic, setTopic: changeTopic, isJoined, messages, error, join, send };
}
