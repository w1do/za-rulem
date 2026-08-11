import { useState, type FormEvent } from 'react';

import type { ChatTopic } from '../model/types';

interface ChatLoginProps {
	city: string;
	topic: ChatTopic;
	draft?: string;
	error: string;
	onJoin: (phoneInput: string) => void;
}

export default function ChatLogin({ city, topic, draft = '', error, onJoin }: ChatLoginProps) {
	const [phoneInput, setPhoneInput] = useState('');

	const handleSubmit = (event: FormEvent) => {
		event.preventDefault();
		event.stopPropagation();
		// Форма живёт внутри страниц с глобальными обработчиками отправки — гасим их.
		event.nativeEvent.stopImmediatePropagation();
		onJoin(phoneInput);
	};

	return (
		<form
			className="dc-login"
			onSubmit={handleSubmit}
			noValidate
			method="GET"
			action="/chat"
			data-skip-service-request
		>
			<input type="hidden" name="city" value={city} />
			<input type="hidden" name="topic" value={topic} />
			{draft && <input type="hidden" name="draft" value={draft} />}
			<div className="dc-login__badge"><i className="fa-solid fa-gas-pump"></i></div>
			<span className="section-sub-title">Чат водителей</span>
			<h3>Укажи номер — и сразу в чат</h3>
			<p>Живой чат, где водители подсказывают друг другу, где сейчас есть топливо и какие очереди на АЗС. Пароль и код из SMS не нужны — номер хранится только на этом устройстве.</p>

			<label htmlFor="dc-phone">Номер телефона</label>
			<div className="form-group dc-login__row">
				<input
					className="form-control"
					id="dc-phone"
					name="phone"
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
	);
}
