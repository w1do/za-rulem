import { useMemo, useState } from 'react';
import { FUEL_PRICE_PER_LITER, DEPARTURE_PRICE_PER_KM, SERVICE_FEE } from '../../data/prices';

type FuelType = 'ai92' | 'ai95';

interface FuelOption {
	label: string;
	shortLabel: string;
}

const FUEL_OPTIONS: Record<FuelType, FuelOption> = {
	ai92: { label: 'АИ-92', shortLabel: '92' },
	ai95: { label: 'АИ-95', shortLabel: '95' },
};

const MIN_LITERS = 1;
const MAX_LITERS = 100;
const MIN_DISTANCE = 1;
const MAX_DISTANCE = 50;
const LITER_PRESETS = [10, 20, 40, 60, 80, 100];

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
	const [liters, setLiters] = useState(20);
	const [distance, setDistance] = useState(5);

	const result = useMemo(() => {
		const normalizedLiters = Number.isFinite(liters) ? liters : MAX_LITERS;
		const safeLiters = Math.min(MAX_LITERS, Math.max(MIN_LITERS, normalizedLiters));
		const fuelOption = FUEL_OPTIONS[fuelType];
		const fuelPrice = safeLiters * FUEL_PRICE_PER_LITER;
		const safeDistance = Math.min(MAX_DISTANCE, Math.max(MIN_DISTANCE, distance));
		const departurePrice = safeDistance * DEPARTURE_PRICE_PER_KM;
		let total = SERVICE_FEE + fuelPrice + departurePrice;

		let discount = 0;
		if (safeLiters >= 60) {
			discount = Math.round(total * 0.1);
			total -= discount;
		}

		return { fuelOption, safeLiters, safeDistance, fuelPrice, departurePrice, total, discount };
	}, [distance, fuelType, liters]);

	const handleLitersChange = (value: string) => {
		const nextValue = Number(value);
		setLiters(
			Number.isFinite(nextValue)
				? Math.min(MAX_LITERS, Math.max(MIN_LITERS, nextValue))
				: MAX_LITERS,
		);
	};

	const handleDistanceChange = (value: string) => {
		const nextValue = Number(value);
		setDistance(
			Number.isFinite(nextValue)
				? Math.min(MAX_DISTANCE, Math.max(MIN_DISTANCE, nextValue))
				: 5,
		);
	};

	const openRequest = () => {
		const subject = `Доставка бензина ${result.fuelOption.label}, ${result.safeLiters} л, выезд ${result.safeDistance} км — расчет ${formatPrice(result.total)}`;

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
						Тариф и объём сразу покажут предварительный итог с выездом, марку укажу в заявке.
					</p>
				</div>

				<div className="fuel-calculator__field-heading">
					<span>Какое топливо привезти</span>
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
							<strong>без отдельной доплаты</strong>
						</button>
					))}
				</div>

				<div className="fuel-calculator__field">
					<div className="fuel-calculator__field-heading">
						<label htmlFor="fuel-liters">Сколько литров привезти</label>
						<output htmlFor="fuel-liters fuel-liters-range">{result.safeLiters} л</output>
					</div>
					<div className="fuel-calculator__volume">
						<input
							id="fuel-liters"
							type="number"
							className="form-control"
							min={MIN_LITERS}
							max={MAX_LITERS}
							step="1"
							value={liters}
							onChange={(event) => handleLitersChange(event.target.value)}
							onBlur={() => setLiters(result.safeLiters)}
							inputMode="numeric"
							aria-describedby="fuel-liters-help"
						/>
						<input
							id="fuel-liters-range"
							type="range"
							min={MIN_LITERS}
							max={MAX_LITERS}
							step="1"
							value={result.safeLiters}
							onChange={(event) => handleLitersChange(event.target.value)}
							aria-label="Объём топлива в литрах"
						/>
					</div>
					<div className="fuel-calculator__presets" aria-label="Быстрый выбор объёма">
						{LITER_PRESETS.map((value) => (
							<button
								key={value}
								type="button"
								className={result.safeLiters === value ? 'active' : ''}
								onClick={() => setLiters(value)}
								aria-pressed={result.safeLiters === value}
							>
								{value} л
							</button>
						))}
					</div>
					<small id="fuel-liters-help">От {MIN_LITERS} до {MAX_LITERS} литров. От 60 л — скидка 10%.</small>
				</div>

				<div className="fuel-calculator__field fuel-calculator__field--distance">
					<div className="fuel-calculator__field-heading">
						<label htmlFor="fuel-distance">Расстояние выезда</label>
						<output htmlFor="fuel-distance">{result.safeDistance} км</output>
					</div>
					<div className="fuel-calculator__range">
						<input
							id="fuel-distance"
							type="range"
							min={MIN_DISTANCE}
							max={MAX_DISTANCE}
							step="1"
							value={result.safeDistance}
							onChange={(event) => handleDistanceChange(event.target.value)}
							aria-describedby="fuel-distance-help"
						/>
					</div>
					<small id="fuel-distance-help">Каждый километр — {formatPrice(DEPARTURE_PRICE_PER_KM)}.</small>
				</div>
			</div>

			<div className="fuel-calculator__summary" aria-live="polite">
				<div className="fuel-calculator__total">
					<span>Предварительная стоимость</span>
					<strong>{formatPrice(result.total)}</strong>
					<small>{result.fuelOption.label} · {result.safeLiters} л · {result.safeDistance} км</small>
				</div>

				<ul className="fuel-calculator__breakdown">
					<li>
						<span>Подача и сервис</span>
						<b>{formatPrice(SERVICE_FEE)}</b>
					</li>
					<li>
						<span>Топливо: {result.safeLiters} л × {formatPrice(FUEL_PRICE_PER_LITER)}</span>
						<b>{formatPrice(result.fuelPrice)}</b>
					</li>
					<li>
						<span>Выезд: {result.safeDistance} км × {formatPrice(DEPARTURE_PRICE_PER_KM)}</span>
						<b>{formatPrice(result.departurePrice)}</b>
					</li>
					{result.discount > 0 && (
						<li className="fuel-calculator__discount">
							<span>Скидка 10% (от 60 л)</span>
							<b>-{formatPrice(result.discount)}</b>
						</li>
					)}
				</ul>

				<p className="fuel-calculator__notice">
					Расчёт предварительный. Точную сумму фиксирую до выезда по адресу и объёму.
				</p>

				<button type="button" className="btn-default btn-highlighted" onClick={openRequest}>
					Заказать {result.fuelOption.shortLabel} на {result.safeLiters} л
				</button>
			</div>
		</section>
	);
}