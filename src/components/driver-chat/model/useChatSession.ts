import { useEffect, useRef, useState } from 'react';

import {
	persistCity,
	persistPrefs,
	readInitialPrefs,
	resolveCity,
	subscribeToCityChange,
	syncUrlPrefs,
	type ChatPrefs,
} from '../lib/chatPrefs';
import { createId } from '../lib/id';
import { isValidPhone, normalizePhone } from '../lib/phone';
import { lockChatPrefsToCity } from './fixedCity';
import type { ChatTopic } from './types';

export interface ChatSession extends ChatPrefs {
	sessionId: string;
	isJoined: boolean;
	error: string;
	join: (phoneInput: string) => void;
	/** Возвращает true, если канал действительно сменился. */
	selectTopic: (topic: ChatTopic) => boolean;
	/** Возвращает true, если город действительно сменился. */
	selectCity: (city: string) => boolean;
}

export interface ChatSessionOptions {
	/** Фиксирует чат на городе страницы и отключает внешние переключения города. */
	fixedCitySlug?: string;
}

/**
 * Кто участвует в чате и какой канал открыт: номер, топик, город.
 * Настройки читаются из URL/localStorage и туда же сохраняются.
 */
export function useChatSession(
	defaultCitySlug: string,
	{ fixedCitySlug }: ChatSessionOptions = {},
): ChatSession {
	const fixedCity = fixedCitySlug ? resolveCity(fixedCitySlug, defaultCitySlug) : undefined;
	const [sessionId] = useState(createId);
	const [prefs, setPrefs] = useState<ChatPrefs>({ phone: '', topic: 'general', city: fixedCity ?? defaultCitySlug });
	const [isJoined, setIsJoined] = useState(false);
	const [error, setError] = useState('');

	// Обработчики вызываются из событий и подряд, поэтому им нужно актуальное
	// значение настроек без ожидания следующего рендера.
	const prefsRef = useRef(prefs);

	const update = (patch: Partial<ChatPrefs>): ChatPrefs => {
		const next = { ...prefsRef.current, ...patch };
		prefsRef.current = next;
		setPrefs(next);
		return next;
	};

	const join = (phoneInput: string) => {
		const phone = normalizePhone(phoneInput);
		if (!isValidPhone(phone)) {
			setError('Укажи номер из 11 цифр.');
			return;
		}
		persistPrefs(update({ phone }), { persistGlobalCity: !fixedCity });
		setIsJoined(true);
		setError('');
	};

	const selectTopic = (topic: ChatTopic): boolean => {
		if (topic === prefsRef.current.topic) return false;
		const next = update({ topic });
		persistPrefs(next, { persistGlobalCity: !fixedCity });
		syncUrlPrefs(next.topic, next.city);
		return true;
	};

	const selectCity = (citySlug: string): boolean => {
		if (fixedCity) return false;
		const city = resolveCity(citySlug, defaultCitySlug);
		if (city === prefsRef.current.city) return false;
		const next = update({ city });
		persistPrefs(next);
		syncUrlPrefs(next.topic, next.city);
		return true;
	};

	useEffect(() => {
		const storedInitial = readInitialPrefs(defaultCitySlug);
		const initial = fixedCity ? lockChatPrefsToCity(storedInitial, fixedCity) : storedInitial;
		update(initial);
		if (!fixedCity) persistCity(initial.city);
		if (initial.phone) {
			persistPrefs(initial, { persistGlobalCity: !fixedCity });
			setIsJoined(true);
		}

		if (fixedCity) return undefined;
		return subscribeToCityChange(selectCity);
	}, []);

	return { ...prefs, sessionId, isJoined, error, join, selectTopic, selectCity };
}
