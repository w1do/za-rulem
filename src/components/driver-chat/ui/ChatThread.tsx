import { useEffect, useRef } from 'react';

import type { ChatMessage, ChatMessageStatus } from '../model/types';

interface ChatThreadProps {
	messages: ChatMessage[];
}

/** Пустая строка вместо «05:00», если у сообщения нет корректного времени. */
const formatTime = (value: string | null): string => {
	if (!value) return '';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '';
	return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
};

const statusLabel = (status?: ChatMessageStatus): string => {
	if (status === 'sending') return ' · отправляется';
	if (status === 'error') return ' · ошибка';
	return '';
};

export default function ChatThread({ messages }: ChatThreadProps) {
	const endRef = useRef<HTMLDivElement>(null);

	// Лента хронологическая: новые сообщения внизу, поэтому держим в фокусе конец списка.
	useEffect(() => {
		endRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
	}, [messages]);

	return (
		<div className="dc-thread" aria-live="polite">
			{messages.map((item) => (
				<div key={item.id} className={`dc-msg dc-msg--${item.author}`}>
					{item.author === 'system' ? (
						<p className="dc-msg__system">{item.text}</p>
					) : (
						<>
							{item.author !== 'me' && (
								<span className="dc-avatar dc-avatar--sm"><i className="fa-solid fa-user"></i></span>
							)}
							<div className="dc-msg__bubble">
								{item.author !== 'me' && <b>Участник</b>}
								<p>{item.text}</p>
								<small>
									{formatTime(item.createdAt)}
									{statusLabel(item.status)}
								</small>
							</div>
						</>
					)}
				</div>
			))}
			<div ref={endRef}></div>
		</div>
	);
}
