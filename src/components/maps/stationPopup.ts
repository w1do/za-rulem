import {
	getFuelAvailability,
	getFuelName,
	getQueueInfo,
	type StationData,
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

/** Собирает HTML подсказки маркера: только представление, без обращений к сети. */
export const buildStationPopupHtml = (item: StationData, chatUrl: string): string => {
	const { station, prices, fuel_statuses, queue_level, closed } = item;

	const queue = getQueueInfo(queue_level);
	const statusColor = closed ? '#dc2626' : queue.color || '#05B958';
	const statusTitle = closed ? 'Закрыто' : queue.status || 'Открыто';

	const services = SERVICE_ICONS.filter(({ key }) => station[key])
		.map(
			({ label, icon }) =>
				`<span class="svc-ico" data-tip="${label}"><i class="fas ${icon}"></i></span>`,
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
						<span class="fuel">${getFuelName(price.fuel_type)}</span>
						<div class="price-details">
							<span class="value">${price.price} ₽</span>
							<span class="avail ${availability === 'Закончился' ? 'out' : ''}">
								${availability}
							</span>
						</div>
					</div>`;
		})
		.join('');

	return `
		<div class="custom-gas-popup ${closed ? 'is-closed' : ''}">
			<div class="popup-header" style="background: ${statusColor}">
				<h4>${station.name}</h4>
				<div class="popup-availability">${statusTitle}</div>
			</div>
			<div class="popup-body">
				<p class="popup-address"><i class="fas fa-map-marker-alt"></i> ${station.address}</p>

				<div class="popup-status-row">
					<div class="status-item">
						<i class="fas ${queue.icon}" style="color: ${queue.color}"></i>
						<span>Очередь: <b>${queue.status}</b></span>
					</div>
				</div>

				${services ? `<div class="popup-services-row">${services}</div>` : ''}

				<div class="popup-prices">${priceItems}</div>
			</div>
			<div class="popup-footer">
				<div class="popup-payments-row">${payments}</div>
				<span>Обновлено: ${new Date(station.last_transaction_at).toLocaleDateString('ru-RU')}</span>
			</div>
			<a class="popup-chat-btn" href="${chatUrl}">
				<i class="fas fa-comments"></i> Перейти в чат
			</a>
		</div>
	`;
};
