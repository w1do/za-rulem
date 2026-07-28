import { useState } from 'react';

import { chatCities, DEFAULT_CITY_SLUG } from '../../data/cities';
import type { ChatTopic } from './model/types';
import { useDriverChat } from './model/useDriverChat';
import { findChannel } from './ui/channels';
import ChatAside from './ui/ChatAside';
import ChatComposer from './ui/ChatComposer';
import ChatHeader from './ui/ChatHeader';
import ChatLogin from './ui/ChatLogin';
import ChatThread from './ui/ChatThread';

export interface DriverChatProps {
	variant?: 'app' | 'section';
}

const cityName = (slug: string): string =>
	chatCities.find((city) => city.slug === slug)?.name ??
	chatCities.find((city) => city.slug === DEFAULT_CITY_SLUG)?.name ??
	'';

export default function DriverChat({ variant = 'section' }: DriverChatProps) {
	const { phone, topic, setTopic, city, setCity, isJoined, messages, error, join, send } = useDriverChat();
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
				phone={phone}
				city={city}
				topic={topic}
				onSelectCity={setCity}
				onSelectTopic={handleSelectTopic}
			/>

			<section className="dc-main">
				<ChatHeader
					channel={channel}
					cityName={cityName(city)}
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
