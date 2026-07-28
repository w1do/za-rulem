import { useEffect, useState } from 'react';
import { fetchGasStations, type MapBounds, type StationData } from '../../lib/gasStations';

const REFRESH_INTERVAL_MS = 30000;

/**
 * Держит список станций актуальным: стартует с данных, отрендеренных на сервере,
 * и периодически перезапрашивает их по границам текущего города.
 */
export const useGasStations = (
	initialStations: StationData[],
	bounds: MapBounds,
): StationData[] => {
	const [stations, setStations] = useState(initialStations);

	useEffect(() => {
		setStations(initialStations);
	}, [initialStations]);

	useEffect(() => {
		const refreshInterval = setInterval(async () => {
			const freshStations = await fetchGasStations(bounds);
			if (freshStations.length > 0) {
				setStations(freshStations);
			}
		}, REFRESH_INTERVAL_MS);

		return () => clearInterval(refreshInterval);
	}, [bounds]);

	return stations;
};
