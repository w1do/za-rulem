import { useMemo } from 'react';
import type { MapBounds, StationData } from '../../lib/gasStations';
import GasMapView from './GasMapView';
import { useGasStations } from './useGasStations';
import './GasMap.css';

interface Props {
	initialStations: StationData[];
	bounds: MapBounds;
	chatUrl: string;
	/** Slug города: по нему обновляются станции из снимков `gas_daily`. */
	citySlug: string;
}

/** Городская обёртка сохраняет прежний контракт и периодическое обновление данных. */
const GasMap = ({ initialStations, bounds, chatUrl, citySlug }: Props) => {
	const stations = useGasStations(initialStations, citySlug);
	const action = useMemo(
		() => ({ href: chatUrl, label: 'Перейти в чат' }),
		[chatUrl],
	);

	return <GasMapView stations={stations} bounds={bounds} action={action} />;
};

export default GasMap;
