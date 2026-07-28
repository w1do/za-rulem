import {
	getFuelAvailability,
	getFuelName,
	getQueueInfo,
	type StationData,
} from '../../lib/gasStations';

const SERVICES: { key: keyof StationData['station']; label: string; icon: string }[] = [
	{ key: 'has_shop', label: 'Магазин', icon: 'fa-shopping-basket' },
	{ key: 'has_cafe', label: 'Кафе', icon: 'fa-coffee' },
	{ key: 'has_toilet', label: 'Туалет', icon: 'fa-restroom' },
	{ key: 'has_car_wash', label: 'Мойка', icon: 'fa-car-wash' },
];

interface Props {
	item: StationData;
	isSelected: boolean;
	onSelect: (item: StationData) => void;
}

/** Карточка АЗС в списке сайдбара. */
const StationListItem = ({ item, isSelected, onSelect }: Props) => {
	const { station, prices, fuel_statuses, queue_level, closed } = item;
	const queue = getQueueInfo(queue_level);
	const statusTitle = closed ? 'Закрыто' : queue.status || 'Открыто';
	const badgeColor = closed ? '#dc2626' : queue.color;

	return (
		<div
			id={`station-${station.id}`}
			onClick={() => onSelect(item)}
			className={`station-item ${isSelected ? 'active' : ''} ${closed ? 'is-closed' : ''}`}
		>
			<div className="station-info">
				<div className="station-header">
					<h5 className="station-name">{station.name}</h5>
					<div
						className="availability-badge"
						style={{ background: `${badgeColor}1a`, color: badgeColor }}
					>
						{statusTitle}
					</div>
				</div>
				<p className="station-address">{station.address}</p>

				<div className="station-meta">
					<span className="meta-item">
						<i
							className={`fas ${queue.icon}`}
							style={{ color: queue.color, fontSize: '10px', marginRight: '4px' }}
						></i>
						{queue.status}
					</span>
					<span className="meta-divider">|</span>
					<span className="meta-item">
						{new Date(station.last_transaction_at).toLocaleDateString('ru-RU')}
					</span>
				</div>

				<div className="station-prices">
					{(prices || []).map((price) => {
						const availability = getFuelAvailability(fuel_statuses, price.fuel_type);

						return (
							<div key={price.fuel_type} className="price-tag">
								<span className="fuel-type">{getFuelName(price.fuel_type)}</span>
								<span className="price-val">{price.price} ₽</span>
								<span className={`fuel-avail ${availability === 'Закончился' ? 'out' : ''}`}>
									{availability}
								</span>
							</div>
						);
					})}
				</div>

				<div className="station-services mt-2">
					{SERVICES.filter(({ key }) => station[key]).map(({ key, label, icon }) => (
						<span key={key} className="svc-ico" data-tip={label}>
							<i className={`fas ${icon}`}></i>
						</span>
					))}
				</div>
			</div>
		</div>
	);
};

export default StationListItem;
