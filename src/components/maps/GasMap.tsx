import { useCallback, useMemo, useState } from 'react';
import {
	filterStations,
	type MapBounds,
	type QueueFilter,
	type StationData,
	type StationMapAction,
} from '../../lib/gasStations';
import StationFiltersPanel from './StationFiltersPanel';
import StationListItem from './StationListItem';
import { useGasMap, type GeolocationState } from './useGasMap';
import { useGasStations } from './useGasStations';
import './GasMap.css';

/** Сценарий использования карты: город, цены, трасса или участок трассы. */
export type GasMapMode = 'city' | 'prices' | 'road' | 'segment';

export interface GasMapProps {
	mode?: GasMapMode;
	bounds: MapBounds;
	/** Готовый список станций (трассы, участки, любые статичные данные). */
	stations?: StationData[];
	/** Серверный список станций для режимов с живым обновлением. */
	initialStations?: StationData[];
	/** Slug города: по нему обновляются станции из снимков `gas_daily`. */
	citySlug?: string;
	action?: StationMapAction;
	/** Ссылка на чат города — используется, если `action` не передан. */
	chatUrl?: string;
	brandAliases?: string[];
	/** Показать именно переданную рамку (участок трассы) вместо городского зума. */
	fitToBounds?: boolean;
}

const MOBILE_MEDIA_QUERY = '(max-width: 767px)';

const LOCATION_HINTS: Record<GeolocationState, string> = {
	idle: '',
	locating: 'Определяем ваше местоположение…',
	found: 'Карта центрирована на вашем местоположении',
	denied: 'Доступ к геолокации запрещён. Разрешите его в настройках браузера.',
	unsupported: 'Браузер не поддерживает определение местоположения',
	error: 'Не удалось определить местоположение. Попробуйте ещё раз.',
};

const QUEUE_LEGEND = [
	{ modifier: 'green', label: 'Без очереди' },
	{ modifier: 'orange', label: 'Средняя очередь' },
	{ modifier: 'red', label: 'Большая очередь' },
	{ modifier: 'neutral', label: 'Нет данных' },
] as const;

/**
 * Единый компонент карты АЗС: фильтры, список, кластеризованные цветные маркеры
 * и определение местоположения для всех сценариев сайта.
 */
const GasMap = ({
	mode = 'city',
	bounds,
	stations,
	initialStations,
	citySlug = '',
	action,
	chatUrl,
	brandAliases,
	fitToBounds,
}: GasMapProps) => {
	const [searchQuery, setSearchQuery] = useState('');
	const [fuelTypes, setFuelTypes] = useState<string[]>([]);
	const [fuelLimit, setFuelLimit] = useState<number | null>(null);
	const [onlyCanister, setOnlyCanister] = useState(false);
	const [queue, setQueue] = useState<QueueFilter>('ALL');
	const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);

	// Ссылка на список должна быть стабильной, иначе карта пересобирается на каждый рендер.
	const sourceStations = useMemo(
		() => stations ?? initialStations ?? [],
		[stations, initialStations],
	);
	// Псевдонимы бренда приходят новым массивом, поэтому фиксируем их по составу.
	const aliasesKey = (brandAliases ?? []).join('|');
	const aliases = useMemo(() => (aliasesKey ? aliasesKey.split('|') : []), [aliasesKey]);

	// Живое обновление работает только когда известен город; иначе список остаётся статичным.
	const liveStations = useGasStations(sourceStations, citySlug);

	const mapAction = useMemo<StationMapAction>(
		() => action ?? { href: chatUrl ?? '#', label: 'Перейти в чат' },
		[action, chatUrl],
	);

	const filteredStations = useMemo(
		() =>
			filterStations(liveStations, {
				searchQuery,
				brandAliases: aliases,
				fuelTypes,
				fuelLimit,
				onlyCanister,
				queue,
			}),
		[liveStations, searchQuery, aliases, fuelTypes, fuelLimit, onlyCanister, queue],
	);

	const handleMarkerClick = useCallback((stationId: string) => {
		setSelectedStationId(stationId);
		document
			.getElementById(`station-${stationId}`)
			?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
	}, []);

	const { containerRef, focusStation, requestLocation, locationState } = useGasMap({
		stations: filteredStations,
		bounds,
		action: mapAction,
		fitToBounds: fitToBounds ?? (mode === 'road' || mode === 'segment'),
		onMarkerClick: handleMarkerClick,
	});

	const handleStationSelect = (item: StationData) => {
		setSelectedStationId(item.station.id);
		focusStation(item);
		if (window.matchMedia(MOBILE_MEDIA_QUERY).matches) setIsSidebarOpen(false);
	};

	const toggleFuelType = (fuelType: string) => {
		setFuelTypes((current) =>
			current.includes(fuelType)
				? current.filter((type) => type !== fuelType)
				: [...current, fuelType],
		);
	};

	const isLocating = locationState === 'locating';
	const hint = LOCATION_HINTS[locationState];
	const isHintError =
		locationState === 'denied' || locationState === 'error' || locationState === 'unsupported';

	return (
		<div className={`gas-map-container gas-map-container--${mode} overflow-hidden`}>
			<button
				className={`sidebar-backdrop d-md-none ${isSidebarOpen ? 'is-visible' : ''}`}
				onClick={() => setIsSidebarOpen(false)}
				type="button"
				aria-label="Закрыть выбор АЗС"
				tabIndex={isSidebarOpen ? 0 : -1}
			/>
			<div className={`gas-sidebar ${isSidebarOpen ? 'is-open' : ''}`}>
				<button
					className="sidebar-close-btn d-md-none"
					onClick={() => setIsSidebarOpen(false)}
					aria-label="Закрыть сайдбар"
					type="button"
				>
					<i className="fas fa-times" aria-hidden="true"></i>
				</button>

				<StationFiltersPanel
					searchQuery={searchQuery}
					fuelTypes={fuelTypes}
					fuelLimit={fuelLimit}
					onlyCanister={onlyCanister}
					queue={queue}
					onSearchQueryChange={setSearchQuery}
					onToggleFuelType={toggleFuelType}
					onToggleFuelLimit={(limit) => setFuelLimit(fuelLimit === limit ? null : limit)}
					onToggleCanister={() => setOnlyCanister(!onlyCanister)}
					onToggleQueue={(next) => setQueue(queue === next ? 'ALL' : next)}
				/>

				<div className="sidebar-list">
					{filteredStations.map((item) => (
						<StationListItem
							key={item.station.id}
							item={item}
							isSelected={selectedStationId === item.station.id}
							onSelect={handleStationSelect}
						/>
					))}
					{filteredStations.length === 0 && <div className="no-results">Ничего не найдено</div>}
				</div>
			</div>
			<div className="map-view">
				<button
					className="sidebar-toggle-btn d-md-none"
					onClick={() => setIsSidebarOpen(true)}
					type="button"
					aria-label="Открыть список АЗС и фильтры"
					aria-expanded={isSidebarOpen}
				>
					<i className="fas fa-gas-pump me-2" aria-hidden="true"></i>
					Выбрать АЗС
				</button>

				<button
					className={`map-locate-btn ${isLocating ? 'is-locating' : ''}`}
					onClick={requestLocation}
					type="button"
					disabled={isLocating}
					title="Определить место"
				>
					<i
						className={`fas ${isLocating ? 'fa-spinner fa-spin' : 'fa-location-crosshairs'}`}
						aria-hidden="true"
					></i>
					<span className="map-locate-btn__label">Определить место</span>
				</button>

				{hint && (
					<div
						className={`map-locate-hint ${isHintError ? 'is-error' : ''}`}
						role="status"
						aria-live="polite"
					>
						{hint}
					</div>
				)}

				<ul className="map-queue-legend" aria-label="Условные обозначения очередей">
					{QUEUE_LEGEND.map((entry) => (
						<li key={entry.modifier} className="map-queue-legend__item">
							<span className={`map-queue-legend__dot map-queue-legend__dot--${entry.modifier}`} />
							{entry.label}
						</li>
					))}
				</ul>

				<div ref={containerRef} style={{ height: '100%', width: '100%' }} />
			</div>
		</div>
	);
};

export default GasMap;
