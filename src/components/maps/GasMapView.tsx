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
import { useGasMap } from './useGasMap';

interface Props {
	stations: StationData[];
	bounds: MapBounds;
	action: StationMapAction;
	brandAliases?: string[];
	routeLines?: [number, number][][];
}

const MOBILE_MEDIA_QUERY = '(max-width: 767px)';

/** Общее контролируемое представление списка, фильтров и карты АЗС. */
const GasMapView = ({ stations, bounds, action, brandAliases = [], routeLines }: Props) => {
	const [searchQuery, setSearchQuery] = useState('');
	const [fuelTypes, setFuelTypes] = useState<string[]>([]);
	const [fuelLimit, setFuelLimit] = useState<number | null>(null);
	const [onlyCanister, setOnlyCanister] = useState(false);
	const [queue, setQueue] = useState<QueueFilter>('ALL');
	const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);

	const filteredStations = useMemo(
		() =>
			filterStations(stations, {
				searchQuery,
				brandAliases,
				fuelTypes,
				fuelLimit,
				onlyCanister,
				queue,
			}),
		[stations, searchQuery, brandAliases, fuelTypes, fuelLimit, onlyCanister, queue],
	);

	const handleMarkerClick = useCallback((stationId: string) => {
		setSelectedStationId(stationId);
		document
			.getElementById(`station-${stationId}`)
			?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
	}, []);

	const { containerRef, focusStation } = useGasMap({
		stations: filteredStations,
		bounds,
		action,
		routeLines,
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

	return (
		<div className="gas-map-container overflow-hidden">
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
				<div ref={containerRef} style={{ height: '100%', width: '100%' }} />
			</div>
		</div>
	);
};

export default GasMapView;
