import { useEffect, useState } from 'react';

import { clearChatDraft, readChatDraft } from './lib/chatDraft';
import type { ChatCityOption, ChatTopic } from './model/types';
import { useDriverChat } from './model/useDriverChat';
import ChatComposer from './ui/ChatComposer';
import ChatLogin from './ui/ChatLogin';
import ChatThread from './ui/ChatThread';
import { chatChannels, findChannel } from './ui/channels';

export interface LightChatPageProps {
	city: ChatCityOption;
}

export default function LightChatPage({ city: pageCity }: LightChatPageProps) {
	const { topic, setTopic, city, isJoined, messages, error, join, send } = useDriverChat(
		pageCity.slug,
		{ fixedCitySlug: pageCity.slug },
	);
	const [initialDraft, setInitialDraft] = useState('');

	useEffect(() => {
		setInitialDraft(readChatDraft());
	}, []);

	useEffect(() => {
		if (isJoined && initialDraft) clearChatDraft();
	}, [initialDraft, isJoined]);

	if (!isJoined) {
		return (
			<div className="dc dc--light dc--login">
				<ChatLogin city={city} topic={topic} draft={initialDraft} error={error} onJoin={join} />
			</div>
		);
	}

	const channel = findChannel(topic);
	const activeTabId = `light-chat-tab-${topic}`;

	const handleSelectTopic = (nextTopic: ChatTopic) => {
		setTopic(nextTopic);
	};

	return (
		<section className="dc dc--light" aria-label={`Чат водителей ${pageCity.name}`}>
			<header className="lc-head">
				<div>
					<strong>Чат водителей</strong>
					<span>{pageCity.name} · сообщения обновляются автоматически</span>
				</div>
				<a href={`/chat?city=${encodeURIComponent(pageCity.slug)}&topic=${topic}`}>
					Открыть полностью
				</a>
			</header>

			<div className="lc-tabs" role="tablist" aria-label="Категории чата">
				{chatChannels.map((item) => (
					<button
						type="button"
						key={item.id}
						id={`light-chat-tab-${item.id}`}
						role="tab"
						aria-controls="light-chat-thread"
						aria-selected={item.id === topic}
						className={item.id === topic ? 'is-active' : undefined}
						onClick={() => handleSelectTopic(item.id)}
					>
						<i className={`fa-solid ${item.icon}`} aria-hidden="true"></i>
						<span>{item.title}</span>
					</button>
				))}
			</div>

			<ChatThread messages={messages} id="light-chat-thread" labelledBy={activeTabId} />

			{error && <div className="dc-alert dc-alert--inline" role="alert">{error}</div>}

			<ChatComposer
				placeholder={channel.placeholder}
				initialMessage={initialDraft}
				onSend={send}
			/>
		</section>
	);
}
