import React from 'react';

interface PriceRow {
	brand: string;
	ai92: string;
	ai95: string;
	diesel: string;
}

const FUEL_PRICES: PriceRow[] = [
	{ brand: 'Газпромнефть', ai92: '66.15 ₽', ai95: '72.14 ₽', diesel: '80.07 ₽' },
	{ brand: 'Лукойл', ai92: '65.66 ₽', ai95: '72.29 ₽', diesel: '81.90 ₽' },
	{ brand: 'Роснефть', ai92: '65.35 ₽', ai95: '71.48 ₽', diesel: '79.96 ₽' },
	{ brand: 'Татнефть', ai92: '67.66 ₽', ai95: '74.50 ₽', diesel: '81.35 ₽' },
	{ brand: 'Башнефть', ai92: '59.95 ₽', ai95: '63.95 ₽', diesel: '75.80 ₽' },
	{ brand: 'Сургутнефтегаз', ai92: '64.80 ₽', ai95: '71.68 ₽', diesel: '78.50 ₽' },
];

export default function FuelPricesTable() {
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
						{FUEL_PRICES.map((row, index) => (
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
