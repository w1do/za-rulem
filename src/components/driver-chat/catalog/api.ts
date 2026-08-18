import { normalizeCreatedAt } from '../api/chatMessages';
import { isChatTopic } from '../model/types';
import type { CityChatMessagePreview } from './model';

const DIRECTUS_URL = (
	process.env.DIRECTUS_URL ||
	process.env.PUBLIC_DIRECTUS_URL ||
	import.meta.env.PUBLIC_DIRECTUS_URL ||
	'https://api.za-rulem.org'
).replace(/\/$/, '');

const REQUEST_TIMEOUT_MS = 8_000;
const MESSAGE_PREVIEW_LIMIT = 3;

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null;

const toMessagePreview = (value: unknown): CityChatMessagePreview | null => {
	if (!isRecord(value)) return null;
	const id = typeof value.id === 'string' ? value.id : '';
	const text = typeof value.text === 'string' ? value.text.trim() : '';
	if (!id || !text) return null;

	return {
		id,
		text: text.length > 220 ? `${text.slice(0, 217).trimEnd()}…` : text,
		topic: isChatTopic(value.topic) ? value.topic : 'general',
		createdAt: normalizeCreatedAt(
			typeof value.date_created === 'string' ? value.date_created : null,
		),
	};
};

/** Серверное превью не запрашивает phone и sessionId из публичной коллекции. */
export const readLatestCityChatMessages = async (
	citySlug: string,
): Promise<CityChatMessagePreview[]> => {
	const params = new URLSearchParams({
		limit: String(MESSAGE_PREVIEW_LIMIT),
		fields: 'id,text,topic,date_created',
		sort: '-date_created',
	});
	params.set('filter[city][_eq]', citySlug);
	params.set('filter[text][_nempty]', 'true');

	const response = await fetch(
		`${DIRECTUS_URL}/items/driver_chat_messages?${params.toString()}`,
		{
			headers: { Accept: 'application/json' },
			signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
		},
	);
	if (!response.ok) throw new Error(`Directus chat preview request failed: ${response.status}`);

	const payload: unknown = await response.json();
	if (!isRecord(payload) || !Array.isArray(payload.data)) return [];
	return payload.data
		.map(toMessagePreview)
		.filter((message): message is CityChatMessagePreview => message !== null);
};
