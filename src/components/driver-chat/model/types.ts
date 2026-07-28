export const CHAT_TOPICS = ['general', 'ai95', 'ai92', 'ai100', 'dt', 'queue'] as const;

export type ChatTopic = (typeof CHAT_TOPICS)[number];

export type ChatMessageStatus = 'sending' | 'sent' | 'error';

export type ChatAuthor = 'me' | 'driver' | 'system';

/** Минимум данных о городе, который сервер передаёт в клиентский чат. */
export type ChatCityOption = {
	slug: string;
	name: string;
};

export interface ChatMessage {
	id: string;
	text: string;
	author: ChatAuthor;
	/** ISO-строка в UTC; null, если Directus не сохранил время. */
	createdAt: string | null;
	status?: ChatMessageStatus;
}

/** Сообщение в том виде, в котором его отдаёт Directus. */
export interface DirectusChatMessage {
	id: string;
	text: string;
	phone: string;
	topic: string;
	city: string;
	sessionId: string;
	author_type: Exclude<ChatAuthor, 'me'> | 'me';
	date_created: string | null;
}

export const isChatTopic = (value: unknown): value is ChatTopic =>
	typeof value === 'string' && (CHAT_TOPICS as readonly string[]).includes(value);
