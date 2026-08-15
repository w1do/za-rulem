import { useEffect, useRef } from 'react';
import {
	getBoundsCenter,
	hasStationCoordinates,
	type MapBounds,
	type StationData,
	type StationMapAction,
} from '../../lib/gasStations';
import { buildStationPopupHtml } from './stationPopup';

const DG_LOADER_URL = 'https://maps.api.2gis.ru/2.0/loader.js?pkg=full';
const CITY_ZOOM = 11;
const STATION_ZOOM = 15;

/** Фирменный пин-маркер АЗС (золотой #F5B754 + тёмный #111827). */
const MARKER_SVG = [
	'<svg width="46" height="58" viewBox="0 0 46 58" fill="none" xmlns="http://www.w3.org/2000/svg">',
	'<path d="M23 2C12.5 2 4 10.4 4 20.8 4 34.8 23 55 23 55s19-20.2 19-34.2C42 10.4 33.5 2 23 2Z" fill="#F5B754" stroke="#111827" stroke-width="2"/>',
	'<circle cx="23" cy="21" r="13.5" fill="#ffffff"/>',
	'<rect x="16.5" y="12.5" width="9.5" height="17.5" rx="1.8" fill="#111827"/>',
	'<rect x="18.3" y="14.6" width="5.9" height="4.4" rx="0.8" fill="#F5B754"/>',
	'<rect x="18.3" y="20.6" width="5.9" height="1.5" rx="0.7" fill="#F5B754" opacity="0.55"/>',
	'<rect x="14.8" y="29.3" width="12.9" height="2.6" rx="1.3" fill="#111827"/>',
	'<rect x="24.4" y="16" width="3" height="2.1" rx="1" fill="#111827"/>',
	'<rect x="26" y="17.5" width="2.2" height="8.5" rx="1.1" fill="#111827"/>',
	'<rect x="26" y="24.5" width="4.2" height="2.1" rx="1" fill="#111827"/>',
	'</svg>',
].join('');

type DGGlobal = {
	then: (callback: () => void) => void;
	map: (container: HTMLElement, options: Record<string, unknown>) => DGMap;
	marker: (position: [number, number], options: Record<string, unknown>) => DGMarker;
	icon: (options: Record<string, unknown>) => unknown;
};

type DGMap = {
	remove: () => void;
	setView: (position: [number, number], zoom: number) => void;
	fitBounds: (bounds: [[number, number], [number, number]], options?: Record<string, unknown>) => void;
};

type DGMarker = {
	addTo: (map: DGMap) => DGMarker;
	bindPopup: (html: string) => void;
	on: (event: string, callback: () => void) => void;
	openPopup: () => void;
};


const getDG = (): DGGlobal | undefined => (window as unknown as { DG?: DGGlobal }).DG;

const loadDG = (onReady: () => void): void => {
	const dg = getDG();
	if (dg) {
		dg.then(onReady);
		return;
	}

	const script = document.createElement('script');
	script.src = DG_LOADER_URL;
	script.async = true;
	script.onload = () => getDG()?.then(onReady);
	document.head.appendChild(script);
};

interface UseGasMapOptions {
	stations: StationData[];
	bounds: MapBounds;
	action: StationMapAction;
	/** Подгонять карту под переданную рамку (участок трассы), а не показывать город. */
	fitToBounds?: boolean;
	/** Вызывается при клике по маркеру, чтобы синхронизировать выбор со списком. */
	onMarkerClick: (stationId: string) => void;
}

interface UseGasMapResult {
	containerRef: React.RefObject<HTMLDivElement>;
	/** Центрирует карту на станции и открывает её подсказку. */
	focusStation: (station: StationData) => void;
}

/**
 * Инкапсулирует работу с картой 2GIS: загрузку SDK, создание карты по границам города
 * и отрисовку маркеров переданных станций.
 */
export const useGasMap = ({
	stations,
	bounds,
	action,
	fitToBounds = false,
	onMarkerClick,
}: UseGasMapOptions): UseGasMapResult => {
	const containerRef = useRef<HTMLDivElement>(null);
	const mapRef = useRef<DGMap | null>(null);
	const markersRef = useRef<Record<string, DGMarker>>({});

	useEffect(() => {
		if (typeof window === 'undefined' || !containerRef.current) return;

		const initMap = () => {
			const DG = getDG();
			if (!DG || !containerRef.current) return;

			if (mapRef.current) {
				mapRef.current.remove();
				markersRef.current = {};
			}

			try {
				const center = getBoundsCenter(bounds);
				
				if (!Number.isFinite(center[0]) || !Number.isFinite(center[1])) {
					console.error('2GIS Map error: Invalid center coordinates', center, bounds);
				}

				const map = DG.map(containerRef.current, {
					center,
					zoom: fitToBounds ? 5 : CITY_ZOOM,
					zoomControl: true,
					fullscreenControl: false,
				});
				mapRef.current = map;

				// Собственная линия маршрута не рисуется: дорога уже есть на подложке 2GIS,
				// от карты нужен только охват участка и метки АЗС.
				if (fitToBounds) {
					map.fitBounds(
						[
							[bounds.minLat, bounds.minLon],
							[bounds.maxLat, bounds.maxLon],
						],
						{ padding: [24, 24] },
					);
				}

				const gasIcon = DG.icon({
					iconUrl: 'data:image/svg+xml;base64,' + btoa(MARKER_SVG),
					iconSize: [40, 50],
					iconAnchor: [20, 50],
					popupAnchor: [0, -48],
				});

				// АЗС без геоданных остаются в списке цен, но на карту не попадают.
				stations.filter(hasStationCoordinates).forEach((item) => {
					const { station } = item;
					const lat = Number(station.lat);
					const lng = Number(station.lng);

					const marker = DG.marker([lat, lng], { icon: gasIcon }).addTo(map);
					marker.bindPopup(buildStationPopupHtml(item, action));
					marker.on('click', () => onMarkerClick(station.id));
					markersRef.current[station.id] = marker;
				});
			} catch (error) {
				console.error('Error initializing map markers:', error);
			}
		};

		loadDG(initMap);

		return () => {
			if (mapRef.current) {
				mapRef.current.remove();
				mapRef.current = null;
			}
		};
	}, [stations, bounds, action, fitToBounds, onMarkerClick]);

	const focusStation = (item: StationData) => {
		const { station } = item;

		if (!mapRef.current || !hasStationCoordinates(item)) return;

		mapRef.current.setView([Number(station.lat), Number(station.lng)], STATION_ZOOM);
		markersRef.current[station.id]?.openPopup();
	};

	return { containerRef, focusStation };
};
