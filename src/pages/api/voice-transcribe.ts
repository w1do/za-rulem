import type { APIRoute } from 'astro';

/**
 * Транскрибация аудио через Polza AI.
 */
const POLZA_AI_API_KEY = import.meta.env.POLZA_AI_API_KEY;
const POLZA_AI_BASE_URL = (import.meta.env.POLZA_AI_BASE_URL || 'https://polza.ai/api/v1').replace(/\/$/, '');
const POLZA_AI_TRANSCRIPTION_MODEL = import.meta.env.POLZA_AI_TRANSCRIPTION_MODEL || 'openai/whisper-1';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
	if (!POLZA_AI_API_KEY) {
		return new Response(JSON.stringify({ ok: false, error: 'Сервис транскрибации не настроен' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	let body;
	try {
		body = await request.json();
	} catch {
		return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	const { audio } = body;
	if (!audio) {
		return new Response(JSON.stringify({ ok: false, error: 'Missing audio data' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	try {
		const response = await fetch(`${POLZA_AI_BASE_URL}/audio/transcriptions`, {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${POLZA_AI_API_KEY}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				model: POLZA_AI_TRANSCRIPTION_MODEL,
				file: audio, // Ожидаем data:audio/...;base64,...
				language: 'ru',
			}),
		});

		const data = await response.json();

		if (!response.ok) {
			console.error('Transcription Error:', data);
			return new Response(JSON.stringify({ ok: false, error: data.error || 'Не удалось распознать голос' }), {
				status: response.status,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		return new Response(JSON.stringify({ ok: true, text: data.text }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error) {
		console.error('Transcription Fetch Error:', error);
		return new Response(JSON.stringify({ ok: false, error: 'Сервис распознавания голоса недоступен' }), {
			status: 502,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};
