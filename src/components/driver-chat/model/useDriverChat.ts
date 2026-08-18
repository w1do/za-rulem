import { useChatMessages } from './useChatMessages';
import { useChatSession, type ChatSessionOptions } from './useChatSession';
import type { ChatMessage, ChatTopic } from './types';

export interface DriverChatState {
	phone: string;
	topic: ChatTopic;
	city: string;
	isJoined: boolean;
	messages: ChatMessage[];
	error: string;
	join: (phoneInput: string) => void;
	send: (text: string) => Promise<boolean>;
	setTopic: (topic: ChatTopic) => void;
	setCity: (city: string) => void;
}

/** Единая точка входа для UI: связывает сессию чата и ленту сообщений канала. */
export function useDriverChat(
	defaultCitySlug: string,
	options: ChatSessionOptions = {},
): DriverChatState {
	const session = useChatSession(defaultCitySlug, options);
	const { messages, error: sendError, send, resetMessages } = useChatMessages({
		isJoined: session.isJoined,
		phone: session.phone,
		topic: session.topic,
		city: session.city,
		sessionId: session.sessionId,
		defaultCitySlug,
	});

	// При смене канала или города лента начинается заново, чтобы не показывать чужой контекст.
	const setTopic = (topic: ChatTopic) => {
		if (session.selectTopic(topic)) resetMessages();
	};

	const setCity = (city: string) => {
		if (session.selectCity(city)) resetMessages();
	};

	return {
		phone: session.phone,
		topic: session.topic,
		city: session.city,
		isJoined: session.isJoined,
		messages,
		error: session.error || sendError,
		join: session.join,
		send,
		setTopic,
		setCity,
	};
}
