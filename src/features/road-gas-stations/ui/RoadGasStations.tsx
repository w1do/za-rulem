import { useEffect, useMemo, useState } from 'react';
import FuelPricesTable from '../../../components/gas-prices/FuelPricesTable';
import GasMapView from '../../../components/maps/GasMapView';
import '../../../components/maps/GasMap.css';
import {
	getFuelPricesFromStations,
	isStationData,
} from '../../../lib/gasStations';
import { getRoadBounds } from '../model/geometry';
import { loadRoadGeometry } from '../model/loadRoadGeometry';
import type { RoadGeometry, RoadStationsResponse } from '../model/types';
import './RoadGasStations.css';

interface Props {
	slug: string;
	code: string;
}

type LoadState =
	| { status: 'loading' }
	| { status: 'success'; response: RoadStationsResponse }
	| { status: 'error'; message: string };

const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

const parseResponse = (value: unknown): RoadStationsResponse | null => {
	if (typeof value !== 'object' || value === null) return null;
	if (!('stations' in value) || !Array.isArray(value.stations) || !value.stations.every(isStationData)) {
		return null;
	}
	if (!('fetchedAt' in value) || typeof value.fetchedAt !== 'string') return null;
	if (!('isPartial' in value) || typeof value.isPartial !== 'boolean') return null;
	return { stations: value.stations, fetchedAt: value.fetchedAt, isPartial: value.isPartial };
};

const RoadGasStations = ({ slug, code }: Props) => {
	const [state, setState] = useState<LoadState>({ status: 'loading' });
	const [geometry, setGeometry] = useState<RoadGeometry | null>(null);
	const [geometryError, setGeometryError] = useState('');
	const [retryNumber, setRetryNumber] = useState(0);
	const action = useMemo(
		() => ({
			href: '/contacts',
			label: `Нужна помощь на ${code}`,
			service: `route:${slug}`,
			subject: `Голосовая заявка с трассы ${code} — za-rulem`,
			title: `Помощь на трассе ${code}`,
		}),
		[code, slug],
	);

	useEffect(() => {
		let isActive = true;
		void loadRoadGeometry(slug)
			.then((loadedGeometry) => {
				if (isActive) setGeometry(loadedGeometry);
			})
			.catch((error: unknown) => {
				if (isActive) {
					setGeometryError(error instanceof Error ? error.message : 'Не удалось загрузить маршрут');
				}
			});
		return () => {
			isActive = false;
		};
	}, [slug]);

	useEffect(() => {
		const controller = new AbortController();
		let isActive = true;

		const loadStations = async (showLoading: boolean) => {
			if (showLoading) setState({ status: 'loading' });
			try {
				const response = await fetch(`/api/routes/${encodeURIComponent(slug)}/gas-stations`, {
					signal: controller.signal,
				});
				const payload: unknown = await response.json();
				const parsed = parseResponse(payload);
				if (!response.ok || !parsed) throw new Error('Данные АЗС временно недоступны');
				if (isActive) setState({ status: 'success', response: parsed });
			} catch (error) {
				if (!isActive || controller.signal.aborted) return;
				setState((current) =>
					!showLoading && current.status === 'success'
						? current
						: {
								status: 'error',
								message:
									error instanceof Error ? error.message : 'Не удалось загрузить АЗС',
							},
				);
			}
		};

		void loadStations(true);
		const refreshInterval = window.setInterval(() => void loadStations(false), REFRESH_INTERVAL_MS);
		return () => {
			isActive = false;
			controller.abort();
			window.clearInterval(refreshInterval);
		};
	}, [slug, retryNumber]);

	const stations = state.status === 'success' ? state.response.stations : [];
	const prices = useMemo(() => getFuelPricesFromStations(stations), [stations]);
	const fetchedAt = state.status === 'success' ? new Date(state.response.fetchedAt) : null;
	const dateLabel = fetchedAt?.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });
	const bounds = useMemo(() => (geometry ? getRoadBounds(geometry) : null), [geometry]);

	return (
		<section className="road-gas-stations" aria-labelledby={`road-gas-title-${slug}`}>
			<div className="container">
				<div className="section-title text-center">
					<span className="section-sub-title">Заправки по пути</span>
					<h2 id={`road-gas-title-${slug}`}>АЗС на трассе {code}: карта и цены</h2>
					<p>
						На карте отмечены заправки в пределах 15 км от трассы. Используйте фильтры,
						чтобы проверить топливо, цену и текущую очередь.
					</p>
				</div>

				{prices.length > 0 && (
					<div className="road-gas-prices">
						<h3>Средние цены на АЗС вдоль трассы {code}</h3>
						<FuelPricesTable
							prices={prices}
							dateLabel={dateLabel}
							disclaimer={`* Средние данные по станциям вдоль трассы ${code}${dateLabel ? ` на ${dateLabel}` : ''}`}
						/>
					</div>
				)}

				<div className="road-gas-status" aria-live="polite">
					{geometryError ? geometryError : state.status === 'loading' ? (
						'Загружаем актуальные АЗС вдоль всей трассы…'
					) : state.status === 'success' && state.response.isPartial ? (
						'Часть участков временно недоступна. На карте показаны полученные станции.'
					) : state.status === 'success' && stations.length === 0 ? (
						'В текущем источнике пока нет свежих данных по АЗС этой трассы.'
					) : state.status === 'error' ? (
						<>
							{state.message}.{' '}
							<button type="button" onClick={() => setRetryNumber((value) => value + 1)}>
								Повторить
							</button>
						</>
					) : null}
				</div>

				{geometry && bounds && (
					<div className="road-gas-map-card">
						<GasMapView
							stations={stations}
							bounds={bounds}
							action={action}
							routeLines={geometry.coordinates}
						/>
					</div>
				)}
				<p className="road-map-attribution">
					Геометрия трассы: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>.
				</p>
			</div>
		</section>
	);
};

export default RoadGasStations;
