import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { directus } from '../../lib/directus';
import { createItem, readItems } from '@directus/sdk';

import { chatCities, DEFAULT_CITY_SLUG } from '../../data/chatCluster';

// ==== Types & Logic ====

export type ChatTopic = 'general' | 'ai95' | 'ai92' | 'dt' | 'queue' | 'ai100';

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
	city: string;
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
	value === 'general' || value === 'ai95' || value === 'ai92' || value === 'dt' || value === 'queue' || value === 'ai100';

const createId = () => {
	try {
		if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
			return crypto.randomUUID();
		}
	} catch {}
	return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

// Пуш-уведомление о новом сообщении, когда вкладка/PWA свёрнута.
// Работает через Notification API, пока страница запущена (соединение живо).
const notifyNewMessage = (text: string) => {
	if (typeof document === 'undefined' || document.visibilityState !== 'hidden') return;
	if (typeof window === 'undefined' || !('Notification' in window)) return;
	if (Notification.permission !== 'granted') return;
	try {
		new Notification('Чат водителей', {
			body: text,
			icon: '/images/logo.svg',
			// Новые уведомления заменяют предыдущие, чтобы не копить стопку.
			tag: 'driver-chat',
		});
	} catch {
		// iOS и часть браузеров не поддерживают конструктор Notification — молча пропускаем.
	}
};

export const normalizePhone = (value: string) => {
	const digits = value.replace(/\D/g, '').slice(0, 11);
	if (!digits) return '';
	const normalized = digits[0] === '8' ? `7${digits.slice(1)}` : digits;
	return `+${normalized}`;
};

export function useDriverChat() {
	const [phone, setPhone] = useState('');
	const [sessionId] = useState(() => createId());
	const [topic, setTopic] = useState<ChatTopic>('general');
	const [city, setCity] = useState<string>(DEFAULT_CITY_SLUG);
	const [isJoined, setIsJoined] = useState(false);
	const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
	const [error, setError] = useState('');

	const phoneRef = useRef(phone);
	phoneRef.current = phone;
	const topicRef = useRef(topic);
	topicRef.current = topic;
	const cityRef = useRef(city);
	cityRef.current = city;

	// Загрузка истории через REST
	const fetchHistory = useCallback(async (currentTopic: ChatTopic, currentCity: string) => {
		try {
			const items = (await directus.request(
				readItems('driver_chat_messages', {
					filter: {
						topic: { _eq: currentTopic },
						city: { _eq: currentCity },
					},
					sort: ['date_created'],
					limit: 50,
				})
			)) as unknown as DirectusMessage[];

			// Пока запрос выполнялся, пользователь мог переключить канал или город —
			// в этом случае ответ уже неактуален.
			if (topicRef.current !== currentTopic || cityRef.current !== currentCity) return;

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

	// Запрашиваем разрешение на уведомления после входа в чат.
	useEffect(() => {
		if (!isJoined) return;
		if (typeof window === 'undefined' || !('Notification' in window)) return;
		if (Notification.permission === 'default') {
			Notification.requestPermission().catch(() => {});
		}
	}, [isJoined]);

	// Real-time подписка через WebSockets + резервный опрос истории
	useEffect(() => {
		if (!isJoined) return;

		let isActive = true;
		let isRealtimeLive = false;
		let stopSubscription: (() => void) | undefined;
		let retryTimer: ReturnType<typeof setTimeout> | undefined;

		const scheduleRetry = () => {
			if (!isActive) return;
			if (retryTimer) clearTimeout(retryTimer);
			retryTimer = setTimeout(() => {
				if (isActive) startRealtime();
			}, 5000);
		};

		const startRealtime = async () => {
			try {
				console.log('[Chat] Connecting to WebSocket...');
				await directus.connect();
				
				if (!isActive) return;

				console.log(`[Chat] Subscribing to: driver_chat_messages (topic: ${topic}, city: ${city})`);
				const { subscription, unsubscribe } = await directus.subscribe('driver_chat_messages', {
					event: 'create',
					query: {
						filter: {
							topic: { _eq: topic },
							city: { _eq: city },
						},
						fields: ['*'],
					},
				});
				
				console.log('[Chat] Subscription created');

				stopSubscription = unsubscribe;
				isRealtimeLive = true;
				// Добираем сообщения, пропущенные до/во время установки соединения.
				fetchHistory(topicRef.current, cityRef.current);
				
				for await (const message of subscription) {
					if (!isActive) break;
					
					console.log('[Chat] Socket event:', message.event, message.data ? 'with data' : 'no data');
					
					if (message.event === 'create' && message.data) {
						const data = Array.isArray(message.data) ? message.data : [message.data];
						
						for (const rawMsg of data) {
							const msg = rawMsg as DirectusMessage;
							
							// Игнорируем свои сообщения по sessionId
							if (msg.sessionId === sessionId) {
								console.log('[Chat] Skipping own message:', msg.id);
								continue;
							}
							
							// Дополнительная проверка топика и города
							// ( city может отсутствовать у старых сообщений — считаем их 'tyumen' )
							const msgCity = msg.city || DEFAULT_CITY_SLUG;
							if (msg.topic !== topic || msgCity !== city) {
								console.log('[Chat] Wrong topic or city skipped:', msg.topic, msgCity);
								continue;
							}

							setMessages((current) => {
								if (current.some((m) => m.id === msg.id)) return current;
								
								const newMsg: ChatMessage = {
									id: msg.id,
									text: msg.text,
									author: msg.phone === phoneRef.current ? 'me' : msg.author_type,
									createdAt: msg.date_created,
									status: 'sent',
								};
								return [...current, newMsg];
							});

							// Показываем пуш-уведомление о чужом сообщении, если чат свёрнут.
							if (msg.phone !== phoneRef.current) notifyNewMessage(msg.text);
						}
					}
				}

				// Итератор завершился без ошибки — соединение закрылось (сеть, сервер).
				isRealtimeLive = false;
				if (isActive) {
					console.warn('[Chat] WebSocket subscription ended, reconnecting...');
					scheduleRetry();
				}
			} catch (e) {
				isRealtimeLive = false;
				if (isActive) {
					console.error('[Chat] WebSocket runtime error:', e);
					// Реконнект через 5 секунд при ошибке
					scheduleRetry();
				}
			}
		};

		startRealtime();
		fetchHistory(topic, city);

		// Резервный режим: пока realtime не работает (сокеты выключены на сервере,
		// сеть, прокси), периодически подтягиваем историю, чтобы сообщения из других
		// вкладок появлялись без перезагрузки страницы.
		const pollTimer = setInterval(() => {
			if (!isRealtimeLive) fetchHistory(topicRef.current, cityRef.current);
		}, 7000);

		return () => {
			isActive = false;
			clearInterval(pollTimer);
			if (retryTimer) clearTimeout(retryTimer);
			if (stopSubscription) {
				try {
					stopSubscription();
				} catch (e) {
					console.error('Failed to stop subscription:', e);
				}
			}
		};
	}, [isJoined, sessionId, fetchHistory, topic, city]);

	useEffect(() => {
		let initialPhone = '';
		let initialTopic: ChatTopic = 'general';
		let initialCity: string = DEFAULT_CITY_SLUG;
		let hasUrlParams = false;

		// 1. Читаем localStorage
		const saved = window.localStorage.getItem(STORAGE_KEY);
		if (saved) {
			try {
				const data = JSON.parse(saved);
				if (data.phone) initialPhone = data.phone;
				if (isTopic(data.topic)) initialTopic = data.topic;
				if (data.city && chatCities.some(c => c.slug === data.city)) {
					initialCity = data.city;
				}
			} catch {
				window.localStorage.removeItem(STORAGE_KEY);
			}
		}

		// 2. Читаем URL (имеет приоритет)
		if (typeof window !== 'undefined') {
			const params = new URLSearchParams(window.location.search);
			const urlTopic = params.get('topic');
			const urlCity = params.get('city');

			if (isTopic(urlTopic)) {
				initialTopic = urlTopic;
				hasUrlParams = true;
			}
			if (urlCity && chatCities.some(c => c.slug === urlCity)) {
				initialCity = urlCity;
				hasUrlParams = true;
			}
		}

		// Применяем
		if (initialPhone) {
			setPhone(initialPhone);
			phoneRef.current = initialPhone;
			setIsJoined(true);
		}
		setTopic(initialTopic);
		topicRef.current = initialTopic;
		setCity(initialCity);
		cityRef.current = initialCity;

		// 3. Запоминаем в localStorage, если был переход по ссылке с параметрами
		if (hasUrlParams) {
			window.localStorage.setItem(
				STORAGE_KEY,
				JSON.stringify({ phone: initialPhone, topic: initialTopic, city: initialCity }),
			);
		}
	}, []);

	const persist = (nextPhone: string, nextTopic: ChatTopic, nextCity: string) => {
		window.localStorage.setItem(
			STORAGE_KEY,
			JSON.stringify({ phone: nextPhone, topic: nextTopic, city: nextCity }),
		);
	};

	const join = (phoneInput: string) => {
		const nextPhone = normalizePhone(phoneInput);
		if (nextPhone.replace(/\D/g, '').length !== 11) {
			setError('Укажи номер из 11 цифр.');
			return;
		}
		phoneRef.current = nextPhone;
		setPhone(nextPhone);
		setIsJoined(true);
		setError('');
		persist(nextPhone, topicRef.current, cityRef.current);
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
			const created = (await directus.request(
				createItem('driver_chat_messages', {
					phone: phoneRef.current,
					text: value,
					topic: topicRef.current,
					city: cityRef.current,
					sessionId,
					author_type: 'driver',
				}),
			)) as unknown as Partial<DirectusMessage> | undefined;

			// Синхронизируем id оптимистичного сообщения с серверным,
			// чтобы опрос истории не создавал дубликат этой же реплики.
			const serverId = created?.id;
			setMessages((current) =>
				current.map((m) =>
					m.id === id ? { ...m, id: serverId ?? m.id, status: 'sent' } : m,
				),
			);
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
		
		if (isJoined && sessionId) persist(phoneRef.current, id, cityRef.current);
	};

	const pickCity = (id: string) => {
		const validCity = chatCities.find(c => c.slug === id) ? id : DEFAULT_CITY_SLUG;
		if (validCity === cityRef.current) return;

		console.log(`[Chat] Switching city to: ${validCity}`);
		cityRef.current = validCity;
		setCity(validCity);
		// Сбрасываем сообщения при смене города
		setMessages([welcomeMessage]);

		if (isJoined && sessionId) persist(phoneRef.current, topicRef.current, validCity);
	};

	return {
		phone,
		topic,
		setTopic: pickChannel,
		city,
		setCity: pickCity,
		isJoined,
		messages,
		error,
		join,
		send,
	};
}
