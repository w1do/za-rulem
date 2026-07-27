import type { FormEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useDriverChat, type ChatTopic } from './useDriverChat';

// ==== UI Components Data ====

interface Channel {
	id: ChatTopic;
	title: string;
	hint: string;
	icon: string;
}

const channels: Channel[] = [
	{ id: 'general', title: 'Общий чат', hint: 'Где сейчас есть топливо', icon: 'fa-comments' },
	{ id: 'ai95', title: 'АИ-95', hint: 'Наличие и очереди', icon: 'fa-gas-pump' },
	{ id: 'ai92', title: 'АИ-92', hint: 'Наличие и очереди', icon: 'fa-gas-pump' },
	{ id: 'dt', title: 'Дизель · ДТ', hint: 'Где заправиться', icon: 'fa-truck-moving' },
	{ id: 'queue', title: 'Очереди на АЗС', hint: 'Сколько сейчас ждать', icon: 'fa-clock' },
];

const promptsByTopic: Record<ChatTopic, string[]> = {
	general: ['Где сейчас есть топливо?', 'Какие АЗС работают?', 'Подскажите по центру'],
	ai95: ['Где есть АИ-95?', 'Очередь на АИ-95?', 'АИ-95 на Мельникайте есть?'],
	ai92: ['Где есть АИ-92?', 'Очередь на АИ-92?', 'АИ-92 в Заречном?'],
	dt: ['Где есть дизель?', 'ДТ по трассе?', 'Очередь на ДТ?'],
	queue: ['Какая очередь на АЗС?', 'Сколько ждать?', 'Где очередь меньше?'],
};

const placeholderByTopic: Record<ChatTopic, string> = {
	general: 'Например: где сейчас есть топливо в центре?',
	ai95: 'Например: есть ли АИ-95 на Мельникайте?',
	ai92: 'Например: где найти АИ-92 в Заречном?',
	dt: 'Например: где заправить дизель по трассе?',
	queue: 'Например: какая сейчас очередь на АЗС?',
};

const formatTime = (value: string) =>
	new Date(value).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

export interface DriverChatProps {
	variant?: 'app' | 'section';
}

// ==== Main Component ====

export default function DriverChat({ variant = 'section' }: DriverChatProps) {
	const { phone, topic, setTopic, isJoined, messages, error, join, send } = useDriverChat();
	
	const [phoneInput, setPhoneInput] = useState('');
	const [message, setMessage] = useState('');
	const [asideOpen, setAsideOpen] = useState(false);
	
	const endRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		endRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
	}, [messages]);

	const handleJoin = (event: FormEvent) => {
		event.preventDefault();
		join(phoneInput);
	};

	const handleSend = async (event: FormEvent) => {
		event.preventDefault();
		if (await send(message)) setMessage('');
	};

	const handlePickChannel = (id: ChatTopic) => {
		setTopic(id);
		setAsideOpen(false);
	};

	const activeChannel = useMemo(
		() => channels.find((item) => item.id === topic) ?? channels[0],
		[topic],
	);

	const initials = useMemo(() => {
		const digits = phone.replace(/\D/g, '');
		return digits ? digits.slice(-2) : 'Я';
	}, [phone]);

	if (!isJoined) {
		return (
			<div className={`dc dc--${variant} dc--login`}>
				<form className="dc-login" onSubmit={handleJoin} noValidate>
					<div className="dc-login__badge"><i className="fa-solid fa-gas-pump"></i></div>
					<span className="section-sub-title">Чат водителей · Тюмень</span>
					<h3>Укажи номер — и сразу в чат</h3>
					<p>Живой чат, где водители подсказывают друг другу, где сейчас есть топливо и какие очереди на АЗС. Пароль и код из SMS не нужны — номер хранится только на этом устройстве.</p>

					<label htmlFor="dc-phone">Номер телефона</label>
					<div className="form-group dc-login__row">
						<input
							className="form-control"
							id="dc-phone"
							type="tel"
							inputMode="tel"
							autoComplete="tel"
							placeholder="+7 999 000-00-00"
							value={phoneInput}
							onChange={(event) => setPhoneInput(event.target.value)}
							required
						/>
						<button className="btn-default" type="submit">Войти в чат</button>
					</div>
					{error && <div className="dc-alert" role="alert">{error}</div>}
					<small><i className="fa-solid fa-lock"></i> Отправляя номер, я принимаю <a href="/privacy-policy">политику конфиденциальности</a>.</small>
				</form>
			</div>
		);
	}

	return (
		<div className={`dc dc--${variant}${asideOpen ? ' dc--aside-open' : ''}`}>
			<aside className="dc-aside">
				<div className="dc-aside__profile">
					<span className="dc-avatar dc-avatar--lg">{initials}</span>
					<div className="dc-aside__profile-body">
						<strong>{phone || 'Гость'}</strong>
						<span className="dc-status"><i></i> на связи</span>
					</div>
				</div>

				<span className="dc-aside__label">Каналы топлива</span>
				<div className="dc-channels" role="tablist" aria-label="Каналы чата">
					{channels.map((item) => (
						<button
							type="button"
							key={item.id}
							role="tab"
							aria-selected={item.id === topic}
							className={`dc-channel${item.id === topic ? ' is-active' : ''}`}
							onClick={() => handlePickChannel(item.id)}
						>
							<span className="dc-channel__icon"><i className={`fa-solid ${item.icon}`}></i></span>
							<span className="dc-channel__body">
								<strong>{item.title}</strong>
								<span>{item.hint}</span>
							</span>
						</button>
					))}
				</div>

				<a className="dc-aside__cta btn-default" href="/chat">
					<i className="fa-solid fa-mobile-screen-button"></i> Открыть приложение
				</a>
			</aside>

			<section className="dc-main">
				<header className="dc-main__head">
					<button
						type="button"
						className="dc-main__toggle"
						aria-label="Показать каналы"
						onClick={() => setAsideOpen((open) => !open)}
					>
						<i className="fa-solid fa-bars"></i>
					</button>
					<span className="dc-avatar"><i className={`fa-solid ${activeChannel.icon}`}></i></span>
					<div className="dc-main__title">
						<strong>{activeChannel.title}</strong>
						<span className="dc-status dc-status--muted"><i></i> Тюмень · сообщения обновляются автоматически</span>
					</div>
				</header>

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
											{item.status === 'sending' ? ' · отправляется' : item.status === 'error' ? ' · ошибка' : ''}
										</small>
									</div>
								</>
							)}
						</div>
					))}
					<div ref={endRef}></div>
				</div>

				{error && <div className="dc-alert dc-alert--inline" role="alert">{error}</div>}

				<div className="dc-prompts">
					{promptsByTopic[topic].map((prompt) => (
						<button type="button" key={prompt} onClick={() => setMessage(prompt)}>{prompt}</button>
					))}
				</div>

				<form className="dc-compose" onSubmit={handleSend}>
					<input
						className="form-control"
						aria-label="Сообщение"
						placeholder={placeholderByTopic[topic]}
						value={message}
						onChange={(event) => setMessage(event.target.value)}
					/>
					<button className="dc-send" type="submit" aria-label="Отправить сообщение">
						<i className="fa-solid fa-paper-plane"></i>
					</button>
				</form>
			</section>

			<button
				type="button"
				className="dc-scrim"
				aria-label="Закрыть панель каналов"
				onClick={() => setAsideOpen(false)}
			></button>
		</div>
	);
}
