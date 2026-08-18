import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { lockChatPrefsToCity } from '../src/components/driver-chat/model/fixedCity.ts';
import { CHAT_TOPICS } from '../src/components/driver-chat/model/types.ts';

test('light chat exposes every category and defaults to the general channel', async () => {
	const channelsSource = await readFile('src/components/driver-chat/ui/channels.ts', 'utf8');
	const channelIds = [...channelsSource.matchAll(/\bid: '([^']+)'/g)].map((match) => match[1]);
	assert.equal(CHAT_TOPICS[0], 'general');
	assert.deepEqual(channelIds, [...CHAT_TOPICS]);
	assert.equal(new Set(channelIds).size, channelIds.length);
});

test('fixed page city overrides a stored city without changing phone or topic', () => {
	assert.deepEqual(
		lockChatPrefsToCity(
			{ phone: '+79990000000', topic: 'ai95', city: 'ekaterinburg' },
			'tyumen',
		),
		{ phone: '+79990000000', topic: 'ai95', city: 'tyumen' },
	);
});

test('light chat is wired into every agreed page family', async () => {
	const integrations = [
		'src/components/pages/GasPricesPage.astro',
		'src/components/pages/GasBrandPricesPage.astro',
		'src/pages/chat-voditeley.astro',
		'src/components/driver-chat/ChatCityLanding.astro',
		'src/components/driver-chat/ChatFuelLanding.astro',
		'src/layouts/HubLayout.astro',
		'src/layouts/ServiceLandingLayout.astro',
		'src/components/pages/DriversPage.astro',
		'src/components/pages/QueuePage.astro',
		'src/pages/drivers/[city]/[service]/[slug].astro',
		'src/pages/route/index.astro',
		'src/layouts/RoadLandingLayout.astro',
		'src/layouts/RouteSegmentLayout.astro',
	];

	for (const file of integrations) {
		const source = await readFile(file, 'utf8');
		assert.match(source, /LightChatBox/, `${file} must render LightChatBox`);
	}

	const hubLayout = await readFile('src/layouts/HubLayout.astro', 'utf8');
	const serviceLayout = await readFile('src/layouts/ServiceLandingLayout.astro', 'utf8');
	assert.match(hubLayout, /showFuelCalculator &&/);
	assert.match(serviceLayout, /cluster === 'toplivo' &&/);
});
