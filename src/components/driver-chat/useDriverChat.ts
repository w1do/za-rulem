import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { directus } from '../../lib/directus';
import { createItem, readItems } from '@directus/sdk';

// ==== Types & Logic ====

export type ChatTopic = 'general' | 'ai95' | 'ai92' | 'dt' | 'queue';

export interface ChatMessage {
	id: string;
	text: string;
	author: 'me' | 'driver' | 'system';
	createdAt: string;
	status?: 'sending' | 'sent' | 'error';
}

interface DirectusMessage {
	id: string;
	text: string;
	phone: string;
	topic: string;
	sessionId: string;
	author_type: 'me' | 'driver' | 'system';
	date_created: string;
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

const createId = () => {
	try {
		if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
			return crypto.randomUUID();
		}
	} catch {}
	return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const normalizePhone = (value: string) => {
	const digits = value.replace(/\D/g, '').slice(0, 11);
	if (!digits) return '';
	const normalized = digits[0] === '8' ? `7${digits.slice(1)}` : digits;
	return `+${normalized}`;
};

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

	// Загрузка истории через REST
	const fetchHistory = useCallback(async (currentTopic: ChatTopic) => {
		try {
			const items = (await directus.request(
				readItems('driver_chat_messages', {
					filter: { topic: { _eq: currentTopic } },
					sort: ['date_created'],
					limit: 50,
				})
			)) as unknown as DirectusMessage[];

			const history = Array.isArray(items)
				? items.map(
						(msg) =>
							({
								id: msg.id,
								text: msg.text,
								author: msg.phone === phoneRef.current ? 'me' : msg.author_type,
								createdAt: msg.date_created,
								status: 'sent',
							}) satisfies ChatMessage,
					)
				: [];

			setMessages((current) => {
				// При загрузке истории мы должны оставить только те сообщения, которых нет в истории.
				// Важно: если мы очистили сообщения при смене топика, то здесь будут только 
				// сообщения, пришедшие по сокетам во время выполнения REST-запроса.
				const existingIds = new Set(history.map(m => m.id));
				const pendingOrNew = current.filter(m => m.id !== 'welcome' && !existingIds.has(m.id));
				
				return [welcomeMessage, ...history, ...pendingOrNew];
			});
		} catch (e) {
			console.error('Failed to fetch chat history:', e);
		}
	}, []);

	// Real-time подписка через WebSockets
	useEffect(() => {
		if (!isJoined) return;

		let isActive = true;
		let stopSubscription: (() => void) | undefined;

		const startRealtime = async () => {
			try {
				console.log('[Chat] Initiating WebSocket connection...');
				
				// Принудительно подключаемся, если не подключены
				try {
					await directus.connect();
					console.log('[Chat] WebSocket connection established');
				} catch (connErr) {
					console.error('[Chat] WebSocket connection error:', connErr);
				}

				if (!isActive) return;

				console.log(`[Chat] Subscribing to: driver_chat_messages (topic: ${topic})`);
				const sub = await directus.subscribe('driver_chat_messages', {
					event: 'create',
					query: {
						filter: { topic: { _eq: topic } },
						fields: ['*'],
					},
				});

				const subscription = sub.subscription || (sub as any);
				stopSubscription = sub.unsubscribe || (sub as any).stop;
				
				console.log('[Chat] Subscription successfully created. Keys:', Object.keys(sub));

				for await (const message of subscription) {
					if (!isActive) break;
					
					console.log('[Chat] Raw WebSocket event received:', message);
					
					// Обработка события 'create'
					// В SDK v23 итератор может возвращать как массив сообщений, так и одно сообщение в зависимости от типа события
					let eventData: any[] = [];
					if (Array.isArray(message.data)) {
						eventData = message.data;
					} else if (message.data) {
						eventData = [message.data];
					} else if (message.item) {
						eventData = [message.item];
					}

					if (eventData.length > 0) {
						for (const rawMsg of eventData) {
							const msg = rawMsg as DirectusMessage;
							
							// Если это сообщение из другого топика (хотя фильтр должен работать на сервере), пропускаем
							if (msg.topic !== topicRef.current) {
								console.log('[Chat] Message topic mismatch, expected:', topicRef.current, 'got:', msg.topic);
								continue;
							}
							
							// Пропускаем свои сообщения (они уже добавлены оптимистично)
							if (msg.sessionId === sessionId) {
								console.log('[Chat] Ignoring own message (sessionId match):', msg.id);
								continue;
							}

							console.log('[Chat] Processing new message from socket:', msg.id);
							setMessages((current) => {
								if (current.some((m) => m.id === msg.id)) {
									console.log('[Chat] Duplicate message ID skipped:', msg.id);
									return current;
								}
								
								const newMsg: ChatMessage = {
									id: msg.id,
									text: msg.text,
									author: msg.phone === phoneRef.current ? 'me' : msg.author_type,
									createdAt: msg.date_created,
									status: 'sent',
								};
								return [...current, newMsg];
							});
						}
					} else {
						console.log('[Chat] No data in event message:', message);
					}
				}
			} catch (e) {
				if (isActive) {
					console.error('[Chat] WebSocket runtime error:', e);
					// Реконнект через 5 секунд при фатальной ошибке
					setTimeout(() => {
						if (isActive) startRealtime();
					}, 5000);
				}
			}
		};

		startRealtime();
		fetchHistory(topic);

		return () => {
			isActive = false;
			if (stopSubscription) {
				try {
					stopSubscription();
				} catch (e) {
					console.error('Failed to stop subscription:', e);
				}
			}
		};
	}, [isJoined, sessionId, fetchHistory, topic]);

	// Загрузка сессии из localStorage
	useEffect(() => {
		const saved = window.localStorage.getItem(STORAGE_KEY);
		if (!saved) return;
		try {
			const data = JSON.parse(saved);
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

	const persist = (nextPhone: string, nextSessionId: string, nextTopic: ChatTopic) => {
		window.localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({ phone: nextPhone, sessionId: nextSessionId, topic: nextTopic }),
		);
	};

	const join = (phoneInput: string) => {
		const nextPhone = normalizePhone(phoneInput);
		if (nextPhone.replace(/\D/g, '').length !== 11) {
			setError('Укажи номер из 11 цифр.');
			return;
		}
		const nextSessionId = createId();
		phoneRef.current = nextPhone;
		setPhone(nextPhone);
		setSessionId(nextSessionId);
		setIsJoined(true);
		setError('');
		persist(nextPhone, nextSessionId, topicRef.current);
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
			await directus.request(
				createItem('driver_chat_messages', {
					phone: phoneRef.current,
					text: value,
					topic: topicRef.current,
					sessionId,
					author_type: 'driver',
				}),
			);
			setMessages((current) => current.map((m) => (m.id === id ? { ...m, status: 'sent' } : m)));
			return true;
		} catch (sendError) {
			setMessages((current) => current.map((m) => (m.id === id ? { ...m, status: 'error' } : m)));
			setError('Сообщение не отправлено. Попробуй ещё раз.');
			return false;
		}
	};

	const pickChannel = (id: ChatTopic) => {
		if (id === topicRef.current) return;
		
		console.log(`[Chat] Switching channel to: ${id}`);
		topicRef.current = id;
		setTopic(id);
		// Сбрасываем сообщения при смене канала, чтобы не видеть старые сообщения
		setMessages([welcomeMessage]);
		
		if (isJoined && sessionId) persist(phoneRef.current, sessionId, id);
	};

	return {
		phone,
		topic,
		setTopic: pickChannel,
		isJoined,
		messages,
		error,
		join,
		send,
	};
}
