import { useState } from 'react';

import { URGENCY_META } from '../model/constants.ts';
import { findTariff, formatPrice } from '../model/pricing.ts';
import { normalizePhone } from '../model/submitRequest.ts';
import type { MapRequest } from '../model/types.ts';
import CallRequestModal from './CallRequestModal.tsx';

/** Карточка выбранной заявки: цена, срочность, текст и прямой звонок. */

export interface RequestDetailsPopupProps {
	request: MapRequest;
	onClose: () => void;
}

export default function RequestDetailsPopup({ request, onClose }: RequestDetailsPopupProps) {
	const urgency = URGENCY_META[request.urgency];
	const tariff = findTariff(request.kind, request.tariffId);
	const digits = normalizePhone(request.phone);
	const [isCallOpen, setCallOpen] = useState(false);

	return (
		<aside
			className="request-details"
			style={{ ['--details-color' as string]: urgency.color }}
			aria-label="Детали заявки"
		>
			<button
				type="button"
				className="request-details__close"
				onClick={onClose}
				aria-label="Закрыть карточку заявки"
			>
				×
			</button>

			<p className="request-details__price">{formatPrice(request.price)}</p>
			<span className="request-details__urgency">{urgency.label}</span>
			<p className="request-details__tariff">
				{tariff?.icon} {tariff?.label ?? 'Заявка'}
			</p>
			<p className="request-details__message">{request.message}</p>

			{digits ? (
				<button
					type="button"
					className="request-details__call"
					onClick={() => setCallOpen(true)}
				>
					Позвонить водителю
				</button>
			) : (
				<p className="request-details__no-phone">
					Телефон скрыт: свяжитесь через чат города.
				</p>
			)}

			{isCallOpen && digits ? (
				<CallRequestModal
					request={request}
					digits={digits}
					onClose={() => setCallOpen(false)}
				/>
			) : null}
		</aside>
	);
}
