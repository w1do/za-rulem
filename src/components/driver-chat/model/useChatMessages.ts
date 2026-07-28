import { useCallback, useEffect, useRef, useState } from 'react';

import { DEFAULT_CITY_SLUG } from '../../../lib/cities/default';
import {
	createChatMessage,
	fetchChatHistory,
	subscribeToChatMessages,
	toChatMessage,
} from '../api/chatMessages';
import { createId } from '../lib/id';
import { notifyNewMessage, requestNotificationPermission } from '../lib/notifications';
import type { ChatMessage, ChatTopic, DirectusChatMessage } from './types';

const RETRY_DELAY_MS = 5000;
const POLL_INTERVAL_MS = 7000;

const welcomeMessage: ChatMessage = {
	id: 'welcome',
	text: 'Чат открыт. Напиши, где сейчас есть топливо или что ищешь: район, АЗС, марку — АИ-92, АИ-95 или ДТ. Здесь водители подсказывают друг другу актуальную обстановку.',
	author: 'system',
	createdAt: new Date().toISOString(),
};

export interface ChatMessagesParams {
	isJoined: boolean;
	phone: string;
	topic: ChatTopic;
	city: string;
	sessionId: string;
}

export interface ChatMessagesState {
	messages: ChatMessage[];
	error: string;
	send: (text: string) => Promise<boolean>;
	resetMessages: () => void;
}

/**
 * Лента канала: история через REST, новые сообщения через WebSocket
 * и резервный опрос, если realtime недоступен.
 */
export function useChatMessages({ isJoined, phone, topic, city, sessionId }: ChatMessagesParams): ChatMessagesState {
	const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
	const [error, setError] = useState('');

	// Ленте нужен актуальный канал и номер внутри долгоживущих подписок.
	const channelRef = useRef({ phone, topic, city });
	channelRef.current = { phone, topic, city };

	const resetMessages = useCallback(() => setMessages([welcomeMessage]), []);

	const appendMessage = useCallback((message: ChatMessage) => {
		setMessages((current) => (current.some((m) => m.id === message.id) ? current : [...current, message]));
	}, []);

	const loadHistory = useCallback(async (currentTopic: ChatTopic, currentCity: string) => {
		try {
			const items = await fetchChatHistory({ topic: currentTopic, city: currentCity });

			// Пока запрос выполнялся, пользователь мог переключить канал или город —
			// в этом случае ответ уже неактуален.
			const channel = channelRef.current;
			if (channel.topic !== currentTopic || channel.city !== currentCity) return;

			const history = items.map((item) => toChatMessage(item, channel.phone));
			const historyIds = new Set(history.map((m) => m.id));

			setMessages((current) => {
				// Оставляем только то, чего нет в истории: оптимистичные отправки
				// и сообщения, пришедшие по сокету во время REST-запроса.
				const pending = current.filter((m) => m.id !== welcomeMessage.id && !historyIds.has(m.id));
				return [welcomeMessage, ...history, ...pending];
			});
		} catch (e) {
			console.error('Failed to fetch chat history:', e);
		}
	}, []);

	const handleIncoming = useCallback(
		(raw: DirectusChatMessage) => {
			const channel = channelRef.current;
			// Свои сообщения уже показаны оптимистично.
			if (raw.sessionId === sessionId) return;
			// city может отсутствовать у старых сообщений — считаем их городом по умолчанию.
			if (raw.topic !== channel.topic || (raw.city || DEFAULT_CITY_SLUG) !== channel.city) return;

			appendMessage(toChatMessage(raw, channel.phone));
			if (raw.phone !== channel.phone) notifyNewMessage(raw.text);
		},
		[appendMessage, sessionId],
	);

	useEffect(() => {
		if (isJoined) requestNotificationPermission();
	}, [isJoined]);

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
			}, RETRY_DELAY_MS);
		};

		const startRealtime = async () => {
			try {
				const { subscription, unsubscribe } = await subscribeToChatMessages({ topic, city });
				if (!isActive) {
					unsubscribe();
					return;
				}

				stopSubscription = unsubscribe;
				isRealtimeLive = true;
				// Добираем сообщения, пропущенные до/во время установки соединения.
				loadHistory(topic, city);

				for await (const event of subscription) {
					if (!isActive) break;
					if (event.event !== 'create' || !event.data) continue;

					const batch = Array.isArray(event.data) ? event.data : [event.data];
					batch.forEach((item) => handleIncoming(item as DirectusChatMessage));
				}

				// Итератор завершился без ошибки — соединение закрылось (сеть, сервер).
				isRealtimeLive = false;
				if (isActive) scheduleRetry();
			} catch (e) {
				isRealtimeLive = false;
				if (isActive) {
					console.error('[Chat] WebSocket error:', e);
					scheduleRetry();
				}
			}
		};

		startRealtime();
		loadHistory(topic, city);

		// Резервный режим: пока realtime не работает (сокеты выключены на сервере,
		// сеть, прокси), периодически подтягиваем историю, чтобы сообщения из других
		// вкладок появлялись без перезагрузки страницы.
		const pollTimer = setInterval(() => {
			if (!isRealtimeLive) loadHistory(topic, city);
		}, POLL_INTERVAL_MS);

		return () => {
			isActive = false;
			clearInterval(pollTimer);
			if (retryTimer) clearTimeout(retryTimer);
			try {
				stopSubscription?.();
			} catch (e) {
				console.error('Failed to stop subscription:', e);
			}
		};
	}, [isJoined, topic, city, loadHistory, handleIncoming]);

	const send = async (text: string): Promise<boolean> => {
		const value = text.trim();
		if (!value) return false;

		const localId = createId();
		setMessages((current) => [
			...current,
			{ id: localId, text: value, author: 'me', createdAt: new Date().toISOString(), status: 'sending' },
		]);
		setError('');

		const channel = channelRef.current;
		try {
			const serverId = await createChatMessage({
				phone: channel.phone,
				text: value,
				topic: channel.topic,
				city: channel.city,
				sessionId,
			});

			// Синхронизируем id оптимистичного сообщения с серверным,
			// чтобы опрос истории не создавал дубликат этой же реплики.
			setMessages((current) =>
				current.map((m) => (m.id === localId ? { ...m, id: serverId ?? m.id, status: 'sent' } : m)),
			);
			return true;
		} catch {
			setMessages((current) => current.map((m) => (m.id === localId ? { ...m, status: 'error' } : m)));
			setError('Сообщение не отправлено. Попробуй ещё раз.');
			return false;
		}
	};

	return { messages, error, send, resetMessages };
}
