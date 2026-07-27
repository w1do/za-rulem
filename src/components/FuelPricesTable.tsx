import React from 'react';

interface PriceRow {
	brand: string;
	ai92: string;
	ai95: string;
	diesel: string;
}

const DEFAULT_FUEL_PRICES: PriceRow[] = [
	{ brand: 'Газпромнефть', ai92: '70.80 ₽', ai95: '78.20 ₽', diesel: '80.90 ₽' },
	{ brand: 'Лукойл', ai92: '72.50 ₽', ai95: '79.90 ₽', diesel: '82.10 ₽' },
	{ brand: 'Роснефть', ai92: '70.50 ₽', ai95: '77.50 ₽', diesel: '80.60 ₽' },
	{ brand: 'Татнефть', ai92: '71.90 ₽', ai95: '78.80 ₽', diesel: '81.50 ₽' },
	{ brand: 'Башнефть', ai92: '69.95 ₽', ai95: '76.95 ₽', diesel: '79.80 ₽' },
	{ brand: 'Сургутнефтегаз', ai92: '70.20 ₽', ai95: '77.90 ₽', diesel: '80.40 ₽' },
];

interface FuelPricesTableProps {
	prices?: PriceRow[];
}

export default function FuelPricesTable({ prices = DEFAULT_FUEL_PRICES }: FuelPricesTableProps) {
	return (
		<div className="fuel-prices-table-wrapper wow fadeInUp">
			<div className="table-responsive">
				<table className="table table-bordered table-striped custom-fuel-table">
					<thead>
						<tr>
							<th>Сеть АЗС</th>
							<th>АИ-92</th>
							<th>АИ-95</th>
							<th>ДТ (Дизель)</th>
						</tr>
					</thead>
					<tbody>
						{prices.map((row, index) => (
							<tr key={index}>
								<td><strong>{row.brand}</strong></td>
								<td>{row.ai92}</td>
								<td>{row.ai95}</td>
								<td>{row.diesel}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<p className="table-disclaimer">
				* Данные носят информационный характер. Точную стоимость на колонке помощник уточнит по приезду.
			</p>

			<style dangerouslySetInnerHTML={{ __html: `
				.custom-fuel-table {
					margin-bottom: 20px;
					border-color: var(--divider-color);
				}
				.custom-fuel-table thead th {
					background-color: var(--primary-color);
					color: var(--white-color);
					border-bottom: 2px solid var(--accent-color);
					padding: 15px;
					text-align: center;
				}
				.custom-fuel-table tbody td {
					padding: 12px 15px;
					vertical-align: middle;
					text-align: center;
					border-color: var(--divider-color);
				}
				.custom-fuel-table tbody td:first-child {
					text-align: left;
					color: var(--primary-color);
				}
				.custom-fuel-table tbody tr:nth-of-type(odd) {
					background-color: rgba(0, 0, 0, 0.02);
				}
				.table-disclaimer {
					font-size: 14px;
					color: var(--text-color);
					opacity: 0.8;
					font-style: italic;
					margin-top: 10px;
				}
				@media (max-width: 767px) {
					.custom-fuel-table thead th, 
					.custom-fuel-table tbody td {
						padding: 8px 10px;
						font-size: 14px;
					}
				}
			`}} />
		</div>
	);
}
