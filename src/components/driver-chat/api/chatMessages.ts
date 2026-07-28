import { createItem, readItems } from '@directus/sdk';
import { directus } from '../../../lib/directus';
import type { ChatMessage, ChatTopic, DirectusChatMessage } from '../model/types';

const COLLECTION = 'driver_chat_messages';
const HISTORY_LIMIT = 50;

interface ChannelFilter {
	topic: ChatTopic;
	city: string;
}

export interface NewChatMessage extends ChannelFilter {
	phone: string;
	text: string;
	sessionId: string;
}

const channelFilter = ({ topic, city }: ChannelFilter) => ({
	topic: { _eq: topic },
	city: { _eq: city },
});

/** Единственная точка преобразования сообщения Directus в модель UI. */
export const toChatMessage = (message: DirectusChatMessage, myPhone: string): ChatMessage => ({
	id: message.id,
	text: message.text,
	author: message.phone === myPhone ? 'me' : message.author_type,
	createdAt: message.date_created,
	status: 'sent',
});

export const fetchChatHistory = async (channel: ChannelFilter): Promise<DirectusChatMessage[]> => {
	const items = (await directus.request(
		readItems(COLLECTION, {
			filter: channelFilter(channel),
			sort: ['date_created'],
			limit: HISTORY_LIMIT,
		}),
	)) as unknown as DirectusChatMessage[];

	return Array.isArray(items) ? items : [];
};

/** Возвращает серверный id созданного сообщения, если Directus его отдал. */
export const createChatMessage = async ({
	phone,
	text,
	topic,
	city,
	sessionId,
}: NewChatMessage): Promise<string | undefined> => {
	const created = (await directus.request(
		createItem(COLLECTION, { phone, text, topic, city, sessionId, author_type: 'driver' }),
	)) as unknown as Partial<DirectusChatMessage> | undefined;

	return created?.id;
};

/**
 * Соединение общее для всего клиента: при смене города/топика подписка
 * перезапускается, а сокет остаётся открытым. Повторный connect() в этом
 * случае бросает 'Cannot connect when state is "open"' — просто игнорируем.
 */
const ensureConnected = async (): Promise<void> => {
	try {
		await directus.connect();
	} catch (e) {
		const message = e instanceof Error ? e.message : String(e);
		if (!/Cannot connect when state is/i.test(message)) throw e;
	}
};

export const subscribeToChatMessages = async (channel: ChannelFilter) => {
	await ensureConnected();
	return directus.subscribe(COLLECTION, {
		event: 'create',
		query: { filter: channelFilter(channel), fields: ['*'] },
	});
};
