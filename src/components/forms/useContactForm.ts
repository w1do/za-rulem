import { useState } from 'react';
import { CALLBACK_ENDPOINT } from './useCallbackForm';

/**
 * Хук формы страницы контактов.
 * Повторяет набор полей референса (имя, фамилия, e-mail, телефон, сообщение)
 * и отправляет заявку на вебхук n8n.
 */
export type ContactStatus = 'idle' | 'loading' | 'success' | 'error';

export interface ContactValues {
	fname: string;
	lname: string;
	email: string;
	phone: string;
	message: string;
}

const initialValues: ContactValues = {
	fname: '',
	lname: '',
	email: '',
	phone: '',
	message: '',
};

export function useContactForm(subject = 'Заявка со страницы контактов') {
	const [values, setValues] = useState<ContactValues>(initialValues);
	const [status, setStatus] = useState<ContactStatus>('idle');
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

		const fullName = [values.fname, values.lname].filter(Boolean).join(' ').trim();

		try {
			const response = await fetch(CALLBACK_ENDPOINT, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email: values.email || 'no-email@za-rulem.ru',
					subject: fullName ? `${subject} — ${fullName}` : subject,
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
