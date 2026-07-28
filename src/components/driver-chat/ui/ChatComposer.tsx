import { useState, type FormEvent } from 'react';

interface ChatComposerProps {
	placeholder: string;
	onSend: (text: string) => Promise<boolean>;
}

export default function ChatComposer({ placeholder, onSend }: ChatComposerProps) {
	const [message, setMessage] = useState('');

	const handleSubmit = async (event: FormEvent) => {
		event.preventDefault();
		if (await onSend(message)) setMessage('');
	};

	return (
		<form className="dc-compose" onSubmit={handleSubmit}>
			<input
				className="form-control"
				aria-label="Сообщение"
				placeholder={placeholder}
				value={message}
				onChange={(event) => setMessage(event.target.value)}
			/>
			<button className="dc-send" type="submit" aria-label="Отправить сообщение">
				<i className="fa-solid fa-paper-plane"></i>
			</button>
		</form>
	);
}
