import { useState } from 'react';

import type { ChatCityOption, ChatTopic } from './model/types';
import { useDriverChat } from './model/useDriverChat';
import { findChannel } from './ui/channels';
import ChatAside from './ui/ChatAside';
import ChatComposer from './ui/ChatComposer';
import ChatHeader from './ui/ChatHeader';
import ChatLogin from './ui/ChatLogin';
import ChatThread from './ui/ChatThread';

export interface DriverChatProps {
	variant?: 'app' | 'section';
	// Справочник городов приходит с сервера: клиент не должен знать про Directus.
	cities: ChatCityOption[];
	defaultCitySlug: string;
}

const cityName = (cities: ChatCityOption[], slug: string): string =>
	cities.find((city) => city.slug === slug)?.name ?? cities[0]?.name ?? '';

export default function DriverChat({ variant = 'section', cities, defaultCitySlug }: DriverChatProps) {
	const { phone, topic, setTopic, city, setCity, isJoined, messages, error, join, send } = useDriverChat(defaultCitySlug);
	const [isAsideOpen, setIsAsideOpen] = useState(false);

	if (!isJoined) {
		return (
			<div className={`dc dc--${variant} dc--login`}>
				<ChatLogin city={city} topic={topic} error={error} onJoin={join} />
			</div>
		);
	}

	const channel = findChannel(topic);

	const handleSelectTopic = (nextTopic: ChatTopic) => {
		setTopic(nextTopic);
		setIsAsideOpen(false);
	};

	return (
		<div className={`dc dc--${variant}${isAsideOpen ? ' dc--aside-open' : ''}`}>
			<ChatAside
				cities={cities}
				phone={phone}
				city={city}
				topic={topic}
				onSelectCity={setCity}
				onSelectTopic={handleSelectTopic}
			/>

			<section className="dc-main">
				<ChatHeader
					channel={channel}
					cityName={cityName(cities, city)}
					showDownload={variant === 'app'}
					onToggleAside={() => setIsAsideOpen((open) => !open)}
				/>

				<ChatThread messages={messages} />

				{error && <div className="dc-alert dc-alert--inline" role="alert">{error}</div>}

				<ChatComposer placeholder={channel.placeholder} onSend={send} />
			</section>

			<button
				type="button"
				className="dc-scrim"
				aria-label="Закрыть панель каналов"
				onClick={() => setIsAsideOpen(false)}
			></button>
		</div>
	);
}
