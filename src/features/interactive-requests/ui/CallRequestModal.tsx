import { useEffect } from 'react';

import { URGENCY_META } from '../model/constants.ts';
import { formatPrice } from '../model/pricing.ts';
import type { MapRequest } from '../model/types.ts';

/** Модальное окно звонка: большая кнопка с номером и памятка перед выездом. */

export interface CallRequestModalProps {
	request: MapRequest;
	/** Номер только из цифр, уже нормализованный. */
	digits: string;
	onClose: () => void;
}

const CALL_RULES = [
	'Поздоровайтесь и будьте вежливы: на связи такой же водитель, а не диспетчер.',
	'Уточните точное место: заправку, номер колонки, ориентир и как вас найти.',
	'Спросите про автомобиль: марку, цвет, номер и особенности (АКПП, газ, прицеп).',
	'Договоритесь о стоимости и способе оплаты до выезда — цена на метке ориентировочная.',
	'Согласуйте время: через сколько минут вы будете на месте и сколько ждать.',
	'Запишите всю информацию и перезвоните, если что-то изменится.',
];

export default function CallRequestModal({ request, digits, onClose }: CallRequestModalProps) {
	const urgency = URGENCY_META[request.urgency];
	const phoneHref = `tel:+${digits}`;

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
			aria-label="Звонок по заявке"
			onClick={(event) => {
				if (event.target === event.currentTarget) onClose();
			}}
		>
			<div className="request-modal__dialog call-modal">
				<div className="request-modal__header">
					<div>
						<h3 className="request-modal__title">Звонок по заявке</h3>
						<p className="request-modal__subtitle">
							{urgency.label} · {formatPrice(request.price)}
						</p>
					</div>
					<button
						type="button"
						className="request-modal__close"
						onClick={onClose}
						aria-label="Закрыть окно звонка"
					>
						×
					</button>
				</div>

				<a className="call-modal__button" href={phoneHref}>
					<span className="call-modal__button-label">Позвонить</span>
					<span className="call-modal__button-phone">{formatPhone(digits)}</span>
				</a>

				<p className="call-modal__hint">
					Перед звонком проверьте памятку — так вы быстрее договоритесь и никого не подведёте.
				</p>

				<ul className="call-modal__rules">
					{CALL_RULES.map((rule) => (
						<li key={rule}>{rule}</li>
					))}
				</ul>
			</div>
		</div>
	);
}

/** Приводит цифры к виду +7 999 123-45-67. */
function formatPhone(digits: string): string {
	if (digits.length !== 11) return `+${digits}`;

	return `+${digits[0]} ${digits.slice(1, 4)} ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9)}`;
}
