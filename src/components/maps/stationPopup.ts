import {
	buildStationActionHref,
	getFuelAvailability,
	getFuelName,
	getQueueInfo,
	type StationData,
	type StationMapAction,
} from '../../lib/gasStations';

const SERVICE_ICONS: { key: keyof StationData['station']; label: string; icon: string }[] = [
	{ key: 'has_shop', label: 'Магазин', icon: 'fa-shopping-basket' },
	{ key: 'has_cafe', label: 'Кафе', icon: 'fa-coffee' },
	{ key: 'has_toilet', label: 'Туалет', icon: 'fa-restroom' },
	{ key: 'has_car_wash', label: 'Мойка', icon: 'fa-car-wash' },
];

const PAYMENT_LABELS: { key: keyof StationData['station']; label: string }[] = [
	{ key: 'pay_card', label: 'Карта' },
	{ key: 'pay_sbp', label: 'СБП' },
	{ key: 'pay_cash', label: 'Нал' },
];

const escapeHtml = (value: unknown): string =>
	String(value ?? '')
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#039;');

const actionAttributes = (action: StationMapAction): string =>
	[
		action.service ? 'data-service-request' : '',
		action.service ? `data-service="${escapeHtml(action.service)}"` : '',
		action.subject ? `data-service-subject="${escapeHtml(action.subject)}"` : '',
		action.title ? `data-service-title="${escapeHtml(action.title)}"` : '',
	]
		.filter(Boolean)
		.join(' ');

/** Собирает безопасный HTML подсказки маркера: только представление, без сети. */
export const buildStationPopupHtml = (item: StationData, action: StationMapAction): string => {
	const { station, prices, fuel_statuses, queue_level, closed } = item;

	const queue = getQueueInfo(queue_level);
	const statusColor = closed ? '#dc2626' : queue.color || '#05B958';
	const statusTitle = closed ? 'Закрыто' : queue.status || 'Открыто';

	const services = SERVICE_ICONS.filter(({ key }) => station[key])
		.map(
			({ label, icon }) =>
				`<span class="svc-ico" data-tip="${escapeHtml(label)}"><i class="fas ${escapeHtml(icon)}"></i></span>`,
		)
		.join('');

	const payments = PAYMENT_LABELS.filter(({ key }) => station[key])
		.map(({ label }) => label)
		.join(' • ');

	const priceItems = (prices || [])
		.map((price) => {
			const availability = getFuelAvailability(fuel_statuses, price.fuel_type);
			return `
					<div class="price-item">
						<span class="fuel">${escapeHtml(getFuelName(price.fuel_type))}</span>
						<div class="price-details">
							<span class="value">${escapeHtml(price.price)} ₽</span>
							<span class="avail ${availability === 'Закончился' ? 'out' : ''}">
								${escapeHtml(availability)}
							</span>
						</div>
					</div>`;
		})
		.join('');

	const actionHref = buildStationActionHref(action, item);

	return `
		<div class="custom-gas-popup ${closed ? 'is-closed' : ''}">
			<div class="popup-header" style="background: ${statusColor}">
				<h4>${escapeHtml(station.name)}</h4>
				<div class="popup-availability">${escapeHtml(statusTitle)}</div>
			</div>
			<div class="popup-body">
				<p class="popup-address"><i class="fas fa-map-marker-alt"></i> ${escapeHtml(station.address)}</p>

				<div class="popup-status-row">
					<div class="status-item">
						<i class="fas ${queue.icon}" style="color: ${queue.color}"></i>
						<span>Очередь: <b>${escapeHtml(queue.status)}</b></span>
					</div>
				</div>

				${services ? `<div class="popup-services-row">${services}</div>` : ''}

				<div class="popup-prices">${priceItems}</div>
			</div>
			<div class="popup-footer">
				<div class="popup-payments-row">${escapeHtml(payments)}</div>
				<span>Обновлено: ${escapeHtml(new Date(station.last_transaction_at).toLocaleDateString('ru-RU'))}</span>
			</div>
			<a class="popup-chat-btn" href="${escapeHtml(actionHref)}" ${actionAttributes(action)}>
				<i class="fas ${action.service ? 'fa-headset' : 'fa-comments'}"></i> ${escapeHtml(action.label)}
			</a>
		</div>
	`;
};
