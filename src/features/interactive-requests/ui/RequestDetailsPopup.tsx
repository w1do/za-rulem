import { useEffect } from 'react';

import { URGENCY_META } from '../model/constants.ts';
import { findTariff, formatPrice } from '../model/pricing.ts';
import { normalizePhone } from '../model/submitRequest.ts';
import type { MapRequest } from '../model/types.ts';

/** Модальное окно заявки: сообщение водителя, стоимость, номер и памятка. */

export interface RequestDetailsPopupProps {
	request: MapRequest;
	onClose: () => void;
}

const CALL_RULES = [
	'Поздоровайтесь и будьте вежливы: на связи такой же водитель, а не диспетчер.',
	'Уточните точное место: заправку, номер колонки, ориентир и как вас найти.',
	'Спросите про автомобиль: марку, цвет, номер и особенности (АКПП, газ, прицеп).',
	'Договоритесь о стоимости и способе оплаты до выезда — цена на метке ориентировочная.',
	'Согласуйте время: через сколько минут вы будете на месте и сколько ждать.',
];

export default function RequestDetailsPopup({ request, onClose }: RequestDetailsPopupProps) {
	const urgency = URGENCY_META[request.urgency];
	const tariff = findTariff(request.kind, request.tariffId);
	const digits = normalizePhone(request.phone);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') onClose();
		};

		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [onClose]);

	return (
		<div
			className="request-modal"
			role="dialog"
			aria-modal="true"
			aria-label="Детали заявки"
			onClick={(event) => {
				if (event.target === event.currentTarget) onClose();
			}}
		>
			<div
				className="request-modal__dialog request-details"
				style={{ ['--details-color' as string]: urgency.color }}
			>
				<div className="request-modal__header">
					<div>
						<p className="request-details__price">{formatPrice(request.price)}</p>
						<span className="request-details__urgency">{urgency.label}</span>
					</div>
					<button
						type="button"
						className="request-modal__close"
						onClick={onClose}
						aria-label="Закрыть карточку заявки"
					>
						×
					</button>
				</div>

				<p className="request-details__tariff">
					{tariff?.icon} {tariff?.label ?? 'Заявка'}
				</p>
				<p className="request-details__message">{request.message}</p>

				{digits ? (
					<>
						<a
							className="call-modal__button"
							href={`tel:+${toDialDigits(digits)}`}
							data-skip-service-request
							onClick={(event) => event.stopPropagation()}
						>
							<span className="call-modal__button-label">Позвонить</span>
							<span className="call-modal__button-phone">{formatPhone(digits)}</span>
						</a>

						<ul className="call-modal__rules">
							{CALL_RULES.map((rule) => (
								<li key={rule}>{rule}</li>
							))}
						</ul>
					</>
				) : (
					<p className="request-details__no-phone">
						Телефон скрыт: свяжитесь через чат города.
					</p>
				)}
			</div>
		</div>
	);
}

/** Приводит российский номер к международному виду: ведущая 8 заменяется на 7. */
function toDialDigits(digits: string): string {
	if (digits.length === 11 && digits.startsWith('8')) return `7${digits.slice(1)}`;

	return digits;
}

/** Приводит цифры к виду +7 999 123-45-67. */
function formatPhone(digits: string): string {
	const dial = toDialDigits(digits);
	if (dial.length !== 11) return `+${dial}`;

	return `+${dial[0]} ${dial.slice(1, 4)} ${dial.slice(4, 7)}-${dial.slice(7, 9)}-${dial.slice(9)}`;
}
