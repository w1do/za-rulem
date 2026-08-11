import type { APIRoute } from 'astro';

import { getCityBySlug } from '../lib/city';

export const GET: APIRoute = () => {
	const city = getCityBySlug();
	const manifest = {
		name: `Чат водителей — где есть топливо · ${city.name}`,
		short_name: 'Чат топлива',
		description: `Живой чат водителей ${city.ofCity}: где сейчас есть бензин и дизель и какие очереди на АЗС.`,
		lang: 'ru',
		start_url: '/chat',
		scope: '/chat',
		display: 'standalone',
		orientation: 'portrait-primary',
		background_color: '#ffffff',
		theme_color: '#F5B754',
		icons: [
			{ src: '/images/favicon.png', sizes: 'any', type: 'image/png', purpose: 'any' },
			{ src: '/images/logo.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
		],
	};

	return new Response(JSON.stringify(manifest), {
		headers: { 'Content-Type': 'application/manifest+json; charset=utf-8' },
	});
};
