import { useCallback, useState, type ChangeEvent, type FormEvent } from 'react';

/** Серверный endpoint: заявка уходит в Telegram. */
export const SERVICE_REQUEST_ENDPOINT = '/api/service-request';

/**
 * Универсальная заявка на выезд/доставку.
 * Поля общие для любой услуги: геолокация, тип помощи, телефон, авто.
 */
export type ServiceRequestStatus = 'idle' | 'loading' | 'success' | 'error';

export const HELP_TYPES = [
	{ value: 'toplivo', label: 'Бензин / подвоз топлива' },
	{ value: 'polomka', label: 'Поломка / техпомощь' },
	{ value: 'prikurit', label: 'Прикурить авто' },
	{ value: 'akkumulyator', label: 'Замена аккумулятора' },
	{ value: 'otogrev', label: 'Отогрев автомобиля' },
	{ value: 'evacuator', label: 'Эвакуатор' },
	{ value: 'other', label: 'Другая помощь' },
] as const;

export type HelpTypeValue = (typeof HELP_TYPES)[number]['value'] | '';

export interface ServiceRequestValues {
	location: string;
	helpType: HelpTypeValue;
	phone: string;
	carBrand: string;
	carNumber: string;
	comment: string;
}

const initialValues: ServiceRequestValues = {
	location: '',
	helpType: '',
	phone: '',
	carBrand: '',
	carNumber: '',
	comment: '',
};

function helpTypeLabel(value: HelpTypeValue): string {
	return HELP_TYPES.find((item) => item.value === value)?.label ?? value;
}

function resolveHelpType(helpType?: string): Pick<ServiceRequestValues, 'helpType' | 'comment'> {
	if (!helpType) return { helpType: '', comment: '' };
	const matched = HELP_TYPES.find(
		(item) => item.value === helpType || item.label.toLowerCase() === helpType.toLowerCase(),
	);
	if (matched) return { helpType: matched.value, comment: '' };
	return { helpType: 'other', comment: helpType };
}

export function useServiceRequestForm(defaultSubject = 'Заявка на выезд — za-rulem') {
	const [values, setValues] = useState<ServiceRequestValues>(initialValues);
	const [status, setStatus] = useState<ServiceRequestStatus>('idle');
	const [error, setError] = useState('');
	const [geoStatus, setGeoStatus] = useState<'idle' | 'loading' | 'error'>('idle');
	const [subject, setSubject] = useState(defaultSubject);

	const handleChange = useCallback(
		(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
			const { name, value } = event.target;
			setValues((prev) => ({ ...prev, [name]: value }));
		},
		[],
	);

	const reset = useCallback((nextSubject?: string, helpType?: string) => {
		const preset = resolveHelpType(helpType);
		setValues({ ...initialValues, ...preset });
		setStatus('idle');
		setError('');
		setGeoStatus('idle');
		if (nextSubject) setSubject(nextSubject);
	}, []);

	const presetHelpType = useCallback((helpType?: string) => {
		if (!helpType) return;
		const preset = resolveHelpType(helpType);
		setValues((prev) => ({
			...prev,
			helpType: preset.helpType,
			comment: prev.comment || preset.comment,
		}));
	}, []);

	const detectLocation = useCallback(() => {
		if (typeof navigator === 'undefined' || !navigator.geolocation) {
			setGeoStatus('error');
			setError('Браузер не отдаёт геолокацию. Укажите адрес вручную.');
			return;
		}

		setGeoStatus('loading');
		setError('');

		navigator.geolocation.getCurrentPosition(
			(position) => {
    const { latitude, longitude } = position.coords;
    const coords = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
				setValues((prev) => ({
					...prev,
					location: prev.location?.trim()
						? `${prev.location.trim()} | ${coords}`
						: coords,
				}));
				setGeoStatus('idle');
			},
			() => {
				setGeoStatus('error');
				setError('Не удалось определить геолокацию. Напишите адрес или ориентир вручную.');
			},
			{ enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
		);
	}, []);

	const handleSubmit = useCallback(
		async (event: FormEvent<HTMLFormElement>) => {
			event.preventDefault();

			if (!values.location.trim()) {
				setStatus('error');
				setError('Укажите точную геолокацию или адрес.');
				return;
			}
			if (!values.helpType) {
				setStatus('error');
				setError('Выберите, какая помощь нужна.');
				return;
			}
			if (!values.phone.trim()) {
				setStatus('error');
				setError('Укажите номер телефона.');
				return;
			}
			if (!values.carBrand.trim()) {
				setStatus('error');
				setError('Укажите марку машины.');
				return;
			}
			if (!values.carNumber.trim()) {
				setStatus('error');
				setError('Укажите госномер машины.');
				return;
			}

			setStatus('loading');
			setError('');

			const helpLabel = helpTypeLabel(values.helpType);
			const messageParts = [
				subject ? `Тема: ${subject}` : '',
				values.comment.trim() ? values.comment.trim() : '',
			].filter(Boolean);

			try {
				const response = await fetch(SERVICE_REQUEST_ENDPOINT, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						location: values.location.trim(),
						help: helpLabel,
						phone: values.phone.trim(),
						car_brand: values.carBrand.trim(),
						gos_number: values.carNumber.trim(),
						message: messageParts.join('\n') || helpLabel,
					}),
				});

				if (!response.ok) {
					throw new Error(`HTTP ${response.status}`);
				}

				setStatus('success');
				setValues(initialValues);
			} catch {
				setStatus('error');
    setError('Не удалось отправить заявку. Попробуйте ещё раз через минуту.');
			}
		},
		[subject, values],
	);

	return {
		values,
		status,
		error,
		geoStatus,
		subject,
		setSubject,
		handleChange,
		handleSubmit,
		detectLocation,
		reset,
		presetHelpType,
	};
}
