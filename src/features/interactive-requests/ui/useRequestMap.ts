import { useCallback, useEffect, useRef, useState } from 'react';

import {
	buildStationMarkerDataUrl,
	resolveQueueColorCategory,
} from '../../../components/maps/markerIcons.ts';
import { buildDraftMarkerMarkup, buildRequestMarkerMarkup } from './RequestMapMarkers.ts';
import type { MapRequest, MapStation, UrgencyLevel } from '../model/types.ts';

/**
 * Работа с картой 2GIS для интерактивных заявок: загрузка SDK, отрисовка
 * пульсирующих меток с ценником, выбор точки кликом и фокус на заявке.
 */

const DG_LOADER_URL = 'https://maps.api.2gis.ru/2.0/loader.js?pkg=full';
const CITY_ZOOM = 11;
const FOCUS_ZOOM = 14;

interface DGGlobal {
	then: (callback: () => void) => void;
	map: (container: HTMLElement, options: Record<string, unknown>) => DGMap;
	marker: (position: [number, number], options: Record<string, unknown>) => DGMarker;
	icon: (options: Record<string, unknown>) => unknown;
	divIcon: (options: Record<string, unknown>) => unknown;
	layerGroup: () => DGLayerGroup;
	point: (x: number, y: number) => unknown;
}

interface DGMap {
	remove: () => void;
	invalidateSize: (animate?: boolean) => void;
	setView: (position: [number, number], zoom: number) => void;
	addLayer: (layer: DGLayerGroup) => void;
	on: (event: string, callback: (event: DGMouseEvent) => void) => void;
}

interface DGMouseEvent {
	latlng: { lat: number; lng: number };
}

interface DGMarker {
	addTo: (target: DGMap | DGLayerGroup) => DGMarker;
	on: (event: string, callback: () => void) => void;
	bindLabel?: (html: string, options?: Record<string, unknown>) => DGMarker;
	setIcon: (icon: unknown) => void;
	setLatLng: (position: [number, number]) => void;
}

interface DGLayerGroup {
	addLayer: (marker: DGMarker) => void;
	removeLayer: (marker: DGMarker) => void;
	clearLayers: () => void;
}

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

export interface UseRequestMapOptions {
	center: [number, number];
	requests: MapRequest[];
	/** АЗС города: подложка карты, чтобы водитель не искал заправку вслепую. */
	stations: MapStation[];
	onStationClick: (station: MapStation) => void;
	/** Точка, выбранная пользователем для новой заявки. */
	draftPoint: { lat: number; lng: number } | null;
	draftUrgency: UrgencyLevel;
	onMapClick: (lat: number, lng: number) => void;
	onRequestClick: (request: MapRequest) => void;
}

export interface UseRequestMapResult {
	containerRef: React.RefObject<HTMLDivElement>;
	/** Центрирует карту на заявке из списка. */
	focusRequest: (request: MapRequest) => void;
}

export const useRequestMap = ({
	center,
	requests,
	stations,
	onStationClick,
	draftPoint,
	draftUrgency,
	onMapClick,
	onRequestClick,
}: UseRequestMapOptions): UseRequestMapResult => {
	const containerRef = useRef<HTMLDivElement>(null);
	const mapRef = useRef<DGMap | null>(null);
	const layerRef = useRef<DGLayerGroup | null>(null);
	const stationLayerRef = useRef<DGLayerGroup | null>(null);
	const draftMarkerRef = useRef<DGMarker | null>(null);

	// Колбэки держим в ref: иначе новая ссылка пересоздавала бы карту на каждый рендер.
	const clickHandlerRef = useRef(onMapClick);
	const requestHandlerRef = useRef(onRequestClick);
	const stationHandlerRef = useRef(onStationClick);
	clickHandlerRef.current = onMapClick;
	requestHandlerRef.current = onRequestClick;
	stationHandlerRef.current = onStationClick;

	// Пока карта не создана, слои рисовать нельзя: SDK грузится асинхронно.
	const [isMapReady, setMapReady] = useState(false);

	useEffect(() => {
		if (typeof window === 'undefined' || !containerRef.current) return;

		let isCancelled = false;
		let resizeTimer = 0;

		const initMap = () => {
			const DG = getDG();
			const container = containerRef.current;
			if (isCancelled || !DG || !container) return;

			mapRef.current?.remove();
			mapRef.current = null;

			// Повторный монтаж (dev StrictMode) оставляет разметку прошлой карты в контейнере:
			// без очистки 2GIS инициализируется поверх и подложка остаётся пустой.
			container.innerHTML = '';
			delete (container as unknown as { _leaflet_id?: number })._leaflet_id;

			const map = DG.map(container, {
				center,
				zoom: CITY_ZOOM,
				zoomControl: true,
				fullscreenControl: false,
			});
			mapRef.current = map;

			// Слой АЗС создаётся первым: заправки должны лежать под метками заявок.
			const stationLayer = DG.layerGroup();
			stationLayerRef.current = stationLayer;
			map.addLayer(stationLayer);

			const layer = DG.layerGroup();
			layerRef.current = layer;
			map.addLayer(layer);

			map.on('click', (event) => {
				clickHandlerRef.current(event.latlng.lat, event.latlng.lng);
			});

			// Контейнер получает финальные размеры после верстки страницы,
			// иначе 2GIS считает область нулевой и не запрашивает тайлы.
			resizeTimer = window.setTimeout(() => map.invalidateSize(false), 250);
			setMapReady(true);
		};

		loadDG(initMap);

		return () => {
			isCancelled = true;
			window.clearTimeout(resizeTimer);
			setMapReady(false);
			layerRef.current?.clearLayers();
			layerRef.current = null;
			stationLayerRef.current?.clearLayers();
			stationLayerRef.current = null;
			draftMarkerRef.current = null;
			mapRef.current?.remove();
			mapRef.current = null;
		};
	}, [center]);

	useEffect(() => {
		if (!isMapReady) return;

		const handleResize = () => mapRef.current?.invalidateSize(false);
		window.addEventListener('resize', handleResize);

		return () => window.removeEventListener('resize', handleResize);
	}, [isMapReady]);

	// Пины АЗС города — те же цветные маркеры, что на карте цен на бензин.
	useEffect(() => {
		const DG = getDG();
		const layer = stationLayerRef.current;
		if (!DG || !layer) return;

		layer.clearLayers();

		stations.forEach((station) => {
			if (!Number.isFinite(station.lat) || !Number.isFinite(station.lng)) return;

			const category = resolveQueueColorCategory(station.queueLevel, station.closed);
			const marker = DG.marker([station.lat, station.lng], {
				icon: DG.icon({
					iconUrl: buildStationMarkerDataUrl(category),
					iconSize: [34, 42],
					iconAnchor: [17, 42],
				}),
				title: station.name,
			});

			marker.bindLabel?.(`${station.name}${station.address ? `, ${station.address}` : ''}`, {
				static: false,
			});
			marker.on('click', () => stationHandlerRef.current(station));
			layer.addLayer(marker);
		});
	}, [stations, isMapReady]);

	// Перерисовка меток заявок: список меняется после каждой новой заявки и фильтрации.
	useEffect(() => {
		const DG = getDG();
		const layer = layerRef.current;
		if (!DG || !layer) return;

		layer.clearLayers();
		draftMarkerRef.current = null;

		requests.forEach((request) => {
			const markup = buildRequestMarkerMarkup(request);
			const marker = DG.marker([request.lat, request.lng], {
				icon: DG.divIcon({
					html: markup.html,
					className: markup.className,
					iconSize: DG.point(markup.size[0], markup.size[1]),
					iconAnchor: DG.point(markup.anchor[0], markup.anchor[1]),
				}),
			});
			marker.on('click', () => requestHandlerRef.current(request));
			layer.addLayer(marker);
		});
	}, [requests, isMapReady]);

	// Метка выбранной точки живёт отдельно, чтобы не пересобирать весь слой при клике.
	useEffect(() => {
		const DG = getDG();
		const layer = layerRef.current;
		if (!DG || !layer) return;

		if (!draftPoint) {
			if (draftMarkerRef.current) {
				layer.removeLayer(draftMarkerRef.current);
				draftMarkerRef.current = null;
			}
			return;
		}

		const markup = buildDraftMarkerMarkup(draftUrgency);
		const icon = DG.divIcon({
			html: markup.html,
			className: markup.className,
			iconSize: DG.point(markup.size[0], markup.size[1]),
			iconAnchor: DG.point(markup.anchor[0], markup.anchor[1]),
		});

		if (draftMarkerRef.current) {
			draftMarkerRef.current.setLatLng([draftPoint.lat, draftPoint.lng]);
			draftMarkerRef.current.setIcon(icon);
			return;
		}

		const marker = DG.marker([draftPoint.lat, draftPoint.lng], { icon });
		layer.addLayer(marker);
		draftMarkerRef.current = marker;
	}, [draftPoint, draftUrgency, requests, isMapReady]);

	const focusRequest = useCallback((request: MapRequest) => {
		mapRef.current?.setView([request.lat, request.lng], FOCUS_ZOOM);
	}, []);

	return { containerRef, focusRequest };
};
