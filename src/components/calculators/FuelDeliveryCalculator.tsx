import { useMemo, useState } from 'react';

type FuelType = 'ai92' | 'ai95';

interface FuelOption {
	label: string;
	shortLabel: string;
	price: number;
}

const FUEL_OPTIONS: Record<FuelType, FuelOption> = {
	ai92: { label: 'АИ-92', shortLabel: '92', price: 125 },
	ai95: { label: 'АИ-95', shortLabel: '95', price: 135 },
};

const MIN_LITERS = 1;
const MAX_LITERS = 15;
const DEPARTURE_PRICE = 2800;

const formatPrice = (value: number) =>
	new Intl.NumberFormat('ru-RU', {
		style: 'currency',
		currency: 'RUB',
		maximumFractionDigits: 0,
	}).format(value);

declare global {
	interface Window {
		openServiceRequest?: (detail?: { service?: string; subject?: string; title?: string }) => void;
	}
}

export default function FuelDeliveryCalculator() {
	const [fuelType, setFuelType] = useState<FuelType>('ai92');
	const [liters, setLiters] = useState(15);

	const result = useMemo(() => {
		const normalizedLiters = Number.isFinite(liters) ? liters : MAX_LITERS;
		const safeLiters = Math.min(MAX_LITERS, Math.max(MIN_LITERS, normalizedLiters));
		const option = FUEL_OPTIONS[fuelType];
		const fuelPrice = safeLiters * option.price;
		const total = fuelPrice + DEPARTURE_PRICE;

		return { option, safeLiters, fuelPrice, total };
	}, [fuelType, liters]);

	const handleLitersChange = (value: string) => {
		const nextValue = Number(value);
		setLiters(Number.isFinite(nextValue) ? Math.min(MAX_LITERS, nextValue) : MAX_LITERS);
	};

	const openRequest = () => {
		const subject = `Доставка бензина ${result.option.label}, ${result.safeLiters} л — расчет ${formatPrice(result.total)}`;

		window.openServiceRequest?.({
			service: 'toplivo',
			title: 'Заказать доставку бензина',
			subject,
		});
	};

	return (
		<section className="fuel-calculator wow fadeInUp" aria-labelledby="fuel-calculator-title">
			<div className="fuel-calculator__content">
				<div className="section-title section-sub-heading">
					<span className="section-sub-title">Калькулятор доставки</span>
					<h2 id="fuel-calculator-title">Расчет стоимости доставки бензина</h2>
					<p>
						Выберите марку и литры — я покажу итог с топливом, доставкой и выездом.
					</p>
				</div>

				<div className="fuel-calculator__controls" role="group" aria-label="Тип бензина">
					{Object.entries(FUEL_OPTIONS).map(([value, option]) => (
						<button
							key={value}
							type="button"
							className={`fuel-calculator__fuel ${fuelType === value ? 'active' : ''}`}
							onClick={() => setFuelType(value as FuelType)}
							aria-pressed={fuelType === value}
						>
							<span>{option.label}</span>
							<strong>{formatPrice(option.price)}/л</strong>
						</button>
					))}
				</div>

				<label className="fuel-calculator__field">
					<span>Сколько литров привезти</span>
					<input
						type="number"
						className="form-control"
						min={MIN_LITERS}
						max={MAX_LITERS}
						step="1"
						value={liters}
						onChange={(event) => handleLitersChange(event.target.value)}
						onBlur={() => setLiters(result.safeLiters)}
						inputMode="numeric"
					/>
					<small>Максимальный объём — {MAX_LITERS} литров.</small>
				</label>
			</div>

			<div className="fuel-calculator__summary" aria-live="polite">
				<div className="fuel-calculator__total">
					<span>Итого к оплате</span>
					<strong>{formatPrice(result.total)}</strong>
				</div>

				<ul className="fuel-calculator__breakdown">
					<li>
						<span>Бензин {result.option.label}</span>
						<b>{formatPrice(result.fuelPrice)}</b>
					</li>
					<li>
						<span>Доставка и выезд</span>
						<b>от {formatPrice(DEPARTURE_PRICE)}</b>
					</li>
				</ul>

				<p>
					Расчёт предварительный. Точную сумму фиксирую до выезда по адресу и объёму.
				</p>

				<button type="button" className="btn-default btn-highlighted" onClick={openRequest}>
					Заказать {result.option.shortLabel} на {result.safeLiters} л
				</button>
			</div>
		</section>
	);
}