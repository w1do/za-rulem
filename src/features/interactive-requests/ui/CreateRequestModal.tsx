import { useEffect, useMemo, useState } from 'react';

import { TARIFFS_BY_KIND, URGENCY_META, URGENCY_ORDER } from '../model/constants.ts';
import { calculateRequestPrice, formatPrice } from '../model/pricing.ts';
import type {
	CreateRequestInput,
	RequestKind,
	RequestValidationErrors,
	UrgencyLevel,
} from '../model/types.ts';
import type { SubmitStatus } from '../model/useRequestStore.ts';

/** Модальное окно подачи заявки: услуга, срочность, телефон и комментарий. */

export interface CreateRequestModalProps {
	kind: RequestKind;
	point: { lat: number; lng: number } | null;
	defaultTariffId: string;
	/** Предзаполненный комментарий: название и адрес выбранной на карте АЗС. */
	initialMessage?: string;
	urgency: UrgencyLevel;
	onUrgencyChange: (urgency: UrgencyLevel) => void;
	status: SubmitStatus;
	errors: RequestValidationErrors;
	submitError: string;
	onSubmit: (input: CreateRequestInput) => void;
	onClose: () => void;
}

const KIND_TEXT: Record<RequestKind, { title: string; subtitle: string; tariffLabel: string }> = {
	queue: {
		title: 'Занять очередь на АЗС',
		subtitle: 'Отметьте точку заправки, и свободный водитель займёт для вас место.',
		tariffLabel: 'Сколько нужно простоять',
	},
	assistance: {
		title: 'Вызвать помощь на дороге',
		subtitle: 'Выберите услугу — ближайший мастер увидит заявку и перезвонит.',
		tariffLabel: 'Что случилось',
	},
};

export default function CreateRequestModal({
	kind,
	point,
	defaultTariffId,
	initialMessage = '',
	urgency,
	onUrgencyChange,
	status,
	errors,
	submitError,
	onSubmit,
	onClose,
}: CreateRequestModalProps) {
	const tariffs = TARIFFS_BY_KIND[kind];
	const [tariffId, setTariffId] = useState(defaultTariffId);
	const [phone, setPhone] = useState('');
	const [message, setMessage] = useState(initialMessage);

	useEffect(() => {
		setTariffId(defaultTariffId);
	}, [defaultTariffId]);

	useEffect(() => {
		if (initialMessage) setMessage(initialMessage);
	}, [initialMessage]);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') onClose();
		};

		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [onClose]);

	const price = useMemo(
		() => calculateRequestPrice(kind, tariffId, urgency),
		[kind, tariffId, urgency],
	);

	const text = KIND_TEXT[kind];
	const isLoading = status === 'loading';

	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		onSubmit({
			kind,
			tariffId,
			urgency,
			lat: point?.lat ?? Number.NaN,
			lng: point?.lng ?? Number.NaN,
			phone,
			message,
		});
	};

	return (
		<div
			className="request-modal"
			role="dialog"
			aria-modal="true"
			aria-labelledby="request-modal-title"
			onClick={(event) => {
				if (event.target === event.currentTarget) onClose();
			}}
		>
			<div className="request-modal__dialog">
				<div className="request-modal__header">
					<div>
						<h2 className="request-modal__title" id="request-modal-title">
							{text.title}
						</h2>
						<p className="request-modal__subtitle">{text.subtitle}</p>
					</div>
					<button
						type="button"
						className="request-modal__close"
						onClick={onClose}
						aria-label="Закрыть окно заявки"
					>
						×
					</button>
				</div>

				<form onSubmit={handleSubmit} noValidate>
					<div className="request-modal__field">
						<span className="request-modal__label">{text.tariffLabel}</span>
						<div className="request-modal__options">
							{tariffs.map((tariff) => (
								<button
									key={tariff.id}
									type="button"
									className="request-modal__option"
									aria-pressed={tariff.id === tariffId}
									onClick={() => setTariffId(tariff.id)}
								>
									<span className="request-modal__option-title">
										{tariff.icon} {tariff.label}
									</span>
									<span className="request-modal__option-note">
										от {formatPrice(tariff.basePrice)}
									</span>
								</button>
							))}
						</div>
						{errors.tariffId ? (
							<p className="request-modal__error">{errors.tariffId}</p>
						) : null}
					</div>

					<div className="request-modal__field">
						<span className="request-modal__label">Насколько срочно</span>
						<div className="request-modal__options">
							{URGENCY_ORDER.map((level) => {
								const meta = URGENCY_META[level];
								return (
									<button
										key={level}
										type="button"
										className="request-modal__option"
										style={{ ['--option-color' as string]: meta.color }}
										aria-pressed={level === urgency}
										onClick={() => onUrgencyChange(level)}
									>
										<span className="request-modal__option-title">{meta.label}</span>
										<span className="request-modal__option-note">
											+{meta.markupPercent}% к тарифу
										</span>
									</button>
								);
							})}
						</div>
					</div>

					<div className="request-modal__total">
						<div>
							<div className="request-modal__total-price">
								{price ? formatPrice(price.totalPrice) : '—'}
							</div>
							<div className="request-modal__total-note">
								{price
									? `Базовый тариф ${formatPrice(price.basePrice)} + ${price.markupPercent}% за срочность`
									: 'Выберите услугу, чтобы увидеть стоимость'}
							</div>
						</div>
					</div>

					<div className="request-modal__field">
						<label className="request-modal__label" htmlFor="request-phone">
							Телефон для связи
						</label>
						<input
							id="request-phone"
							className="request-modal__input"
							type="tel"
							name="phone"
							inputMode="tel"
							autoComplete="tel"
							placeholder="+7 (900) 000-00-00"
							value={phone}
							onChange={(event) => setPhone(event.target.value)}
							aria-invalid={Boolean(errors.phone)}
							aria-describedby={errors.phone ? 'request-phone-error' : undefined}
						/>
						{errors.phone ? (
							<p className="request-modal__error" id="request-phone-error">
								{errors.phone}
							</p>
						) : null}
					</div>

					<div className="request-modal__field">
						<label className="request-modal__label" htmlFor="request-message">
							Комментарий: марка авто, колонка, ориентир
						</label>
						<textarea
							id="request-message"
							className="request-modal__textarea"
							name="message"
							placeholder="Например: белая Лада Гранта, 3 колонка, стою у входа в магазин"
							value={message}
							onChange={(event) => setMessage(event.target.value)}
							aria-invalid={Boolean(errors.message)}
							aria-describedby={errors.message ? 'request-message-error' : undefined}
						/>
						{errors.message ? (
							<p className="request-modal__error" id="request-message-error">
								{errors.message}
							</p>
						) : null}
					</div>

					{errors.point ? <p className="request-modal__error">{errors.point}</p> : null}

					<button type="submit" className="request-modal__submit" disabled={isLoading}>
						{isLoading ? 'Отправляем заявку…' : 'Разместить заявку на карте'}
					</button>

					{status === 'error' && submitError ? (
						<p className="request-modal__status request-modal__status--error" role="alert">
							{submitError}
						</p>
					) : null}
					{status === 'success' ? (
						<p className="request-modal__status request-modal__status--success" role="status">
							Заявка размещена на карте — ждите звонка.
						</p>
					) : null}
				</form>
			</div>
		</div>
	);
}
