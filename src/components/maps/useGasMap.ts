import { useCallback, useEffect, useRef, useState } from 'react';
import {
	getBoundsCenter,
	hasStationCoordinates,
	type MapBounds,
	type StationData,
	type StationMapAction,
} from '../../lib/gasStations';
import { buildStationPopupHtml } from './stationPopup';
import {
	buildStationMarkerIconOptions,
	getStationQueueCategory,
	type QueueColorCategory,
} from './markerIcons';
import { buildClusterIconMarkup, type ClusterQueueBreakdown } from './clusterIcon';

const DG_LOADER_URL = 'https://maps.api.2gis.ru/2.0/loader.js?pkg=full';
const CITY_ZOOM = 11;
const STATION_ZOOM = 15;
const USER_LOCATION_ZOOM = 14;
const GEOLOCATION_TIMEOUT_MS = 10_000;

type DGGlobal = {
	then: (callback: () => void) => void;
	map: (container: HTMLElement, options: Record<string, unknown>) => DGMap;
	marker: (position: [number, number], options: Record<string, unknown>) => DGMarker;
	icon: (options: Record<string, unknown>) => unknown;
	divIcon: (options: Record<string, unknown>) => unknown;
	layerGroup: () => DGLayerGroup;
	markerClusterGroup?: (options: Record<string, unknown>) => DGClusterGroup;
	point: (x: number, y: number) => unknown;
};

type DGMap = {
	remove: () => void;
	setView: (position: [number, number], zoom: number) => void;
	getZoom: () => number;
	getMaxZoom: () => number;
	project: (position: [number, number], zoom: number) => { x: number; y: number };
	fitBounds: (bounds: [[number, number], [number, number]], options?: Record<string, unknown>) => void;
	addLayer: (layer: DGClusterGroup | DGLayerGroup) => void;
	on: (event: string, callback: () => void) => void;
};

type DGMarker = {
	addTo: (target: DGMap | DGClusterGroup | DGLayerGroup) => DGMarker;
	bindPopup: (html: string) => void;
	on: (event: string, callback: () => void) => void;
	openPopup: () => void;
};

type DGClusterCluster = {
	getChildCount: () => number;
	getAllChildMarkers?: () => Array<{ options?: { queueCategory?: QueueColorCategory } }>;
};

type DGClusterGroup = {
	addLayer: (marker: DGMarker) => void;
	clearLayers: () => void;
};

type DGLayerGroup = {
	addLayer: (marker: DGMarker) => void;
	clearLayers: () => void;
};

/** Сторона ячейки сетки кластеризации в экранных пикселях. */
const CLUSTER_GRID_PX = 70;
/** Насколько приближается карта по клику на кластер. */
const CLUSTER_ZOOM_STEP = 2;

/** Считает состав кластера по цветовым категориям очереди. */
const buildQueueBreakdown = (items: StationData[]): ClusterQueueBreakdown =>
	items.reduce<ClusterQueueBreakdown>((acc, item) => {
		const category = getStationQueueCategory(item);
		acc[category] = (acc[category] ?? 0) + 1;
		return acc;
	}, {});

interface ClusterCell {
	items: StationData[];
	latSum: number;
	lngSum: number;
}

/** Группирует станции по экранной сетке текущего масштаба. */
const groupStationsByGrid = (
	map: DGMap,
	items: StationData[],
	zoom: number,
): ClusterCell[] => {
	const cells = new Map<string, ClusterCell>();

	items.forEach((item) => {
		const lat = Number(item.station.lat);
		const lng = Number(item.station.lng);
		const point = map.project([lat, lng], zoom);
		const key = `${Math.floor(point.x / CLUSTER_GRID_PX)}:${Math.floor(point.y / CLUSTER_GRID_PX)}`;
		const cell = cells.get(key);

		if (cell) {
			cell.items.push(item);
			cell.latSum += lat;
			cell.lngSum += lng;
			return;
		}

		cells.set(key, { items: [item], latSum: lat, lngSum: lng });
	});

	return [...cells.values()];
};

/** Состояния кнопки «Определить место». */
export type GeolocationState = 'idle' | 'locating' | 'found' | 'denied' | 'unsupported' | 'error';

export interface UserLocation {
	lat: number;
	lng: number;
	accuracy: number;
}

const USER_MARKER_SVG = [
	'<svg width="28" height="28" viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">',
	'<circle cx="14" cy="14" r="12" fill="#F5B754" fill-opacity="0.25"/>',
	'<circle cx="14" cy="14" r="6" fill="#F5B754" stroke="#111827" stroke-width="2"/>',
	'</svg>',
].join('');

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
	/** Запрашивает геолокацию браузера и центрирует карту на пользователе. */
	requestLocation: () => void;
	locationState: GeolocationState;
	userLocation: UserLocation | null;
}

/**
 * Инкапсулирует работу с картой 2GIS: загрузку SDK, создание карты по границам города,
 * кластеризацию цветных маркеров АЗС и определение местоположения пользователя.
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
	const clusterGroupRef = useRef<DGClusterGroup | null>(null);
	const layerGroupRef = useRef<DGLayerGroup | null>(null);
	const userMarkerRef = useRef<DGMarker | null>(null);
	const userLocationRef = useRef<UserLocation | null>(null);

	const [locationState, setLocationState] = useState<GeolocationState>('idle');
	const [userLocation, setUserLocation] = useState<UserLocation | null>(null);

	/** Рисует маркер «Вы здесь» на актуальном экземпляре карты. */
	const renderUserMarker = useCallback((location: UserLocation) => {
		const DG = getDG();
		const map = mapRef.current;
		if (!DG || !map) return;

		const icon = DG.icon({
			iconUrl: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(USER_MARKER_SVG)}`,
			iconSize: [28, 28],
			iconAnchor: [14, 14],
			popupAnchor: [0, -16],
		});

		const marker = DG.marker([location.lat, location.lng], {
			icon,
			zIndexOffset: 1000,
		}).addTo(map);
		marker.bindPopup(`Вы здесь (±${Math.round(location.accuracy)} м)`);
		userMarkerRef.current = marker;
	}, []);

	useEffect(() => {
		if (typeof window === 'undefined' || !containerRef.current) return;

		const initMap = () => {
			const DG = getDG();
			if (!DG || !containerRef.current) return;

			if (mapRef.current) {
				mapRef.current.remove();
				markersRef.current = {};
				clusterGroupRef.current = null;
				layerGroupRef.current = null;
				userMarkerRef.current = null;
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

				// АЗС без геоданных остаются в списке цен, но на карту не попадают.
				const mappable = stations.filter(hasStationCoordinates);

				/** Создаёт маркер отдельной АЗС с цветом по уровню очереди. */
				const createStationMarker = (item: StationData): DGMarker => {
					const { station } = item;
					const icon = DG.icon(buildStationMarkerIconOptions(item));
					const marker = DG.marker([Number(station.lat), Number(station.lng)], {
						icon,
						queueCategory: getStationQueueCategory(item),
					});
					marker.bindPopup(buildStationPopupHtml(item, action));
					marker.on('click', () => onMarkerClick(station.id));

					return marker;
				};

				if (DG.markerClusterGroup) {
					const clusterGroup = DG.markerClusterGroup({
						zoomToBoundsOnClick: true,
						spiderfyOnMaxZoom: true,
						showCoverageOnHover: false,
						maxClusterRadius: CLUSTER_GRID_PX,
						iconCreateFunction: (cluster: DGClusterCluster) => {
							const breakdown = (cluster.getAllChildMarkers?.() ?? []).reduce<ClusterQueueBreakdown>(
								(acc, marker) => {
									const category = marker.options?.queueCategory;
									if (category) acc[category] = (acc[category] ?? 0) + 1;
									return acc;
								},
								{},
							);
							const markup = buildClusterIconMarkup(cluster.getChildCount(), breakdown);

							return DG.divIcon({
								html: markup.html,
								className: markup.className,
								iconSize: DG.point(markup.size[0], markup.size[1]),
							});
						},
					});
					clusterGroupRef.current = clusterGroup;

					mappable.forEach((item) => {
						const marker = createStationMarker(item);
						clusterGroup.addLayer(marker);
						markersRef.current[item.station.id] = marker;
					});

					map.addLayer(clusterGroup);
				} else {
					// Плагин кластеризации 2GIS доступен не всегда, поэтому группируем метки
					// сами по экранной сетке: иначе на карту попадают сотни маркеров и она подвисает.
					const layerGroup = DG.layerGroup();
					layerGroupRef.current = layerGroup;
					map.addLayer(layerGroup);

					const renderClusters = () => {
						const zoom = map.getZoom();
						layerGroup.clearLayers();
						markersRef.current = {};

						groupStationsByGrid(map, mappable, zoom).forEach((cell) => {
							if (cell.items.length === 1) {
								const [item] = cell.items;
								const marker = createStationMarker(item);
								layerGroup.addLayer(marker);
								markersRef.current[item.station.id] = marker;
								return;
							}

							const count = cell.items.length;
							const markup = buildClusterIconMarkup(count, buildQueueBreakdown(cell.items));
							const center: [number, number] = [cell.latSum / count, cell.lngSum / count];
							const clusterMarker = DG.marker(center, {
								icon: DG.divIcon({
									html: markup.html,
									className: markup.className,
									iconSize: DG.point(markup.size[0], markup.size[1]),
								}),
							});
							clusterMarker.on('click', () => {
								map.setView(center, Math.min(zoom + CLUSTER_ZOOM_STEP, map.getMaxZoom()));
							});
							layerGroup.addLayer(clusterMarker);
						});
					};

					renderClusters();
					map.on('zoomend', renderClusters);
				}

				// После пересборки карты положение пользователя не теряется.
				if (userLocationRef.current) renderUserMarker(userLocationRef.current);
			} catch (error) {
				console.error('Error initializing map markers:', error);
			}
		};

		loadDG(initMap);

		return () => {
			clusterGroupRef.current?.clearLayers();
			clusterGroupRef.current = null;
			layerGroupRef.current?.clearLayers();
			layerGroupRef.current = null;
			markersRef.current = {};
			userMarkerRef.current = null;

			if (mapRef.current) {
				mapRef.current.remove();
				mapRef.current = null;
			}
		};
	}, [stations, bounds, action, fitToBounds, onMarkerClick, renderUserMarker]);

	const focusStation = (item: StationData) => {
		const { station } = item;

		if (!mapRef.current || !hasStationCoordinates(item)) return;

		mapRef.current.setView([Number(station.lat), Number(station.lng)], STATION_ZOOM);

		// При собственной кластеризации маркер станции появляется только после
		// перерисовки по `zoomend`, поэтому попап открываем следующим кадром.
		const openPopup = () => markersRef.current[station.id]?.openPopup();
		openPopup();
		window.setTimeout(openPopup, 350);
	};

	const requestLocation = useCallback(() => {
		if (typeof navigator === 'undefined' || !navigator.geolocation) {
			setLocationState('unsupported');
			return;
		}

		setLocationState('locating');

		navigator.geolocation.getCurrentPosition(
			(position) => {
				const location: UserLocation = {
					lat: position.coords.latitude,
					lng: position.coords.longitude,
					accuracy: Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : 0,
				};

				userLocationRef.current = location;
				setUserLocation(location);
				setLocationState('found');

				renderUserMarker(location);
				mapRef.current?.setView([location.lat, location.lng], USER_LOCATION_ZOOM);
			},
			(error) => {
				setLocationState(error.code === error.PERMISSION_DENIED ? 'denied' : 'error');
			},
			{ enableHighAccuracy: true, timeout: GEOLOCATION_TIMEOUT_MS, maximumAge: 60_000 },
		);
	}, [renderUserMarker]);

	return { containerRef, focusStation, requestLocation, locationState, userLocation };
};
