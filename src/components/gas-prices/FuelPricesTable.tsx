import React from 'react';
import type { PriceRow } from '../../lib/gasStations';

interface FuelPricesTableProps {
	prices: PriceRow[];
	dateLabel?: string;
	disclaimer?: string;
}

/**
 * Форматирует текущий месяц и год для подписи в таблице.
 * Например: "июль 2026".
 */
const getCurrentDateLabel = () => {
	const now = new Date();
	const month = now.toLocaleString('ru-RU', { month: 'long' });
	const year = now.getFullYear();
	return `${month} ${year}`;
};

export default function FuelPricesTable({ prices, dateLabel, disclaimer }: FuelPricesTableProps) {
	const displayDate = dateLabel || getCurrentDateLabel();

	if (!prices || prices.length === 0) {
		return null;
	}

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
				{disclaimer ?? `* Средние данные по городу на ${displayDate}`}
			</p>

			<style dangerouslySetInnerHTML={{ __html: `
				.custom-fuel-table {
					margin-bottom: 20px;
					border-color: var(--divider-color);
					background: var(--white-color);
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
					color: var(--text-color);
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
					text-align: right;
				}
				@media (max-width: 767px) {
					.custom-fuel-table thead th, 
					.custom-fuel-table tbody td {
						padding: 8px 10px;
						font-size: 14px;
					}
					.table-disclaimer {
						text-align: left;
					}
				}
			`}} />
		</div>
	);
}
