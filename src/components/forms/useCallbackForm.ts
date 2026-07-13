import { useState } from 'react';

/**
 * Хук формы обратной заявки.
 * Инкапсулирует состояние полей, статус отправки и обращение к вебхуку n8n.
 */
export const CALLBACK_ENDPOINT = 'https://n8n.w1do.ru/webhook/requests';

export type CallbackStatus = 'idle' | 'loading' | 'success' | 'error';

export interface CallbackValues {
	name: string;
	phone: string;
	email: string;
	message: string;
}

const initialValues: CallbackValues = {
	name: '',
	phone: '',
	email: '',
	message: '',
};

export function useCallbackForm(subject = 'Заявка с сайта za-rulem') {
	const [values, setValues] = useState<CallbackValues>(initialValues);
	const [status, setStatus] = useState<CallbackStatus>('idle');
	const [error, setError] = useState<string>('');

	const handleChange = (
		event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
	) => {
		const { name, value } = event.target;
		setValues((prev) => ({ ...prev, [name]: value }));
	};

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (!values.phone.trim()) {
			setStatus('error');
			setError('Укажите номер телефона, чтобы я мог перезвонить.');
			return;
		}

		setStatus('loading');
		setError('');

		try {
			const response = await fetch(CALLBACK_ENDPOINT, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: values.email || 'no-email@za-rulem.ru',
					subject: values.name ? `${subject} — ${values.name}` : subject,
					phone: values.phone,
					message: values.message || 'Клиент просит перезвонить.',
					project: 'za-rulem',
				}),
			});

			if (!response.ok) {
				throw new Error(`HTTP ${response.status}`);
			}

			setStatus('success');
			setValues(initialValues);
		} catch (err) {
			setStatus('error');
			setError('Не удалось отправить заявку. Позвоните мне напрямую: +7 908 871-20-26.');
		}
	};

	return { values, status, error, handleChange, handleSubmit };
}
