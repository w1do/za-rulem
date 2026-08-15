import { useEffect, useState } from 'react';
import { fetchCityGasStations, type StationData } from '../../lib/gasStations';

const REFRESH_INTERVAL_MS = 30000;

/**
 * Держит список станций актуальным: стартует с данных, отрендеренных на сервере,
 * и периодически перезапрашивает станции города из снимков `gas_daily`.
 */
export const useGasStations = (
	initialStations: StationData[],
	citySlug: string,
): StationData[] => {
	const [stations, setStations] = useState(initialStations);

	useEffect(() => {
		setStations(initialStations);
	}, [initialStations]);

	useEffect(() => {
		if (!citySlug) return;

		const refreshInterval = setInterval(async () => {
			const freshStations = await fetchCityGasStations(citySlug);
			if (freshStations.length > 0) {
				setStations(freshStations);
			}
		}, REFRESH_INTERVAL_MS);

		return () => clearInterval(refreshInterval);
	}, [citySlug]);

	return stations;
};
