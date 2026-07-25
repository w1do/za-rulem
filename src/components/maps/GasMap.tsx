import React, { useEffect, useRef, useState, useMemo } from 'react';

interface FuelPrice {
  station_id: string;
  fuel_type: string;
  price: number;
  updated_at: string;
}

interface FuelStatus {
  station_id: string;
  fuel_type: string;
  available: boolean | null;
  queue_level: string;
  limit_liters?: number;
  reports_count?: number;
  last_report_at?: string;
}

interface StationData {
  station: {
    id: string;
    region_id: number;
    name: string;
    brand: string;
    address: string;
    lat: number;
    lng: number;
    last_transaction_at: string;
    has_shop: boolean;
    has_cafe: boolean;
    has_toilet: boolean;
    has_car_wash: boolean;
    pay_card: boolean;
    pay_cash: boolean;
    pay_sbp: boolean;
    fuel_assortment: string[];
  };
  fuel_statuses: FuelStatus[];
  prices: FuelPrice[];
  status: string;
  closed: boolean;
  queue_level: string;
  can_use_canister?: boolean;
}

interface GasMapProps {
  stations: StationData[];
}

const GasMap: React.FC<GasMapProps> = ({ stations: initialStations }) => {
  const [stations, setStations] = useState(initialStations);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  
  // Filters State
  const [filterFuel, setFilterFuel] = useState<string[]>([]);
  const [filterToilet, setFilterToilet] = useState(false);
  const [filterCanister, setFilterCanister] = useState(false);
  const [filterQueue, setFilterQueue] = useState<'ALL' | 'SMALL' | 'LARGE'>('ALL');

  useEffect(() => {
    const refreshInterval = setInterval(async () => {
      try {
        const response = await fetch('https://benzin.api.2gis.ru/api/v1/stations?minLat=57.0&maxLat=57.3&minLon=65.2&maxLon=65.9');
        if (response.ok) {
          const newData = await response.json();
          setStations(newData);
        }
      } catch (error) {
        console.error('Error auto-refreshing gas data:', error);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(refreshInterval);
  }, []);

  const getQueueInfo = (level: string) => {
    switch (level) {
      case 'NONE':
        return { status: "Свободно", color: "#059669", icon: "fa-check-circle" };
      case 'FROM_10_TO_25':
        return { status: "Мало машин", color: "#2563eb", icon: "fa-info-circle" };
      case 'FROM_25_TO_50':
        return { status: "Средняя очередь", color: "#d97706", icon: "fa-exclamation-circle" };
      case 'OVER_50':
        return { status: "Большая очередь", color: "#dc2626", icon: "fa-exclamation-triangle" };
      default:
        return { status: "Нет данных", color: "#999", icon: "fa-question-circle" };
    }
  };

  const getFuelName = (type: string) => {
    switch (type) {
      case 'AI_92': return '92';
      case 'AI_95': return '95';
      case 'AI_98': return '98';
      case 'AI_100': return '100';
      case 'DT': return 'ДТ';
      case 'GAS': return 'Газ';
      default: return type;
    }
  };

  const getFuelAvailability = (fuelStatuses: FuelStatus[] | undefined, fuelType: string) => {
    if (!fuelStatuses) return "В наличии";
    const status = fuelStatuses.find(s => s.fuel_type === fuelType);
    if (!status) return "В наличии";
    if (status.available === false) return "Закончился";
    if (status.limit_liters && status.limit_liters > 0) return `Лимит ${status.limit_liters}л`;
    return "В наличии";
  };

  const filteredStations = useMemo(() => {
    if (!Array.isArray(stations)) return [];
    return stations.filter(s => {
      // Search match
      const matchesSearch = s.station?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            s.station?.address?.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (!matchesSearch) return false;

      // Fuel filter
      if (filterFuel.length > 0) {
        const hasFuel = s.prices?.some(p => filterFuel.includes(p.fuel_type));
        if (!hasFuel) return false;
      }

      // Toilet filter
      if (filterToilet && !s.station?.has_toilet) return false;

      // Canister filter
      if (filterCanister && !s.can_use_canister) return false;

      // Queue filter
      if (filterQueue === 'SMALL') {
        if (!['NONE', 'FROM_10_TO_25'].includes(s.queue_level)) return false;
      } else if (filterQueue === 'LARGE') {
        if (!['FROM_25_TO_50', 'OVER_50'].includes(s.queue_level)) return false;
      }

      return true;
    });
  }, [stations, searchQuery, filterFuel, filterToilet, filterCanister, filterQueue]);

  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    const initMap = () => {
      const DG = (window as any).DG;
      if (!DG || !mapContainerRef.current) return;

      if (mapRef.current) {
        mapRef.current.remove();
        markersRef.current = {};
      }

      try {
        const map = DG.map(mapContainerRef.current, {
          center: [57.1522, 65.5272],
          zoom: 12,
          zoomControl: true,
          fullscreenControl: false
        });
        mapRef.current = map;

        const svg = '<svg width="40" height="50" viewBox="0 0 40 50" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 0C8.95431 0 0 8.95431 0 20C0 35 20 50 20 50C20 50 40 35 40 20C40 8.95431 31.0457 0 20 0Z" fill="#F5B754"/><circle cx="20" cy="20" r="16" fill="white"/><path d="M26 14V17H25V14H24V23H25V20H26V23C26 23.55 25.55 24 25 24S24 23.55 24 23V19H23.5V25H28.5V20.5H29.25V23C29.25 24.1 30.15 25 31.25 25S33.25 24.1 33.25 23V17.75C33.25 16.92 32.74 16.24 32.04 16.01L30.46 14.43L29.39 15.5L30.97 17.08C30.27 17.35 29.75 18.03 29.75 18.86C29.75 19.9 30.6 20.75 31.64 20.75C31.91 20.75 32.16 20.69 32.39 20.59V23.75C32.39 24.16 32.06 24.5 31.64 24.5C31.23 24.5 30.9 24.16 30.9 23.75V19.5C30.9 18.67 30.23 18 29.4 18H28.65V12.75C28.65 11.92 27.98 11.25 27.15 11.25H22.65C21.82 11.25 21.15 11.92 21.15 12.75V25H28.65V19.38L29.4 19.38V12.75H22.65V24.25H27.15V12.75H28.65" fill="#F5B754"/></svg>';
        const gasIcon = DG.icon({
          iconUrl: 'data:image/svg+xml;base64,' + btoa(svg),
          iconSize: [36, 45],
          iconAnchor: [18, 45],
          popupAnchor: [0, -45]
        });

        if (Array.isArray(stations)) {
          stations.forEach(item => {
            const { station, prices, fuel_statuses, queue_level, closed } = item;
            if (!station) return;
            
            const lat = station.lat;
            const lng = station.lng;
            
            if (lat && lng) {
              const marker = DG.marker([lat, lng], { icon: gasIcon }).addTo(map);
              
              const queue = getQueueInfo(queue_level);
              const statusColor = closed ? '#dc2626' : (queue.color || '#05B958');
              const statusTitle = closed ? 'Закрыто' : (queue.status || 'Открыто');

              // Services
              const services = [];
              if (station.has_shop) services.push('<i class="fas fa-shopping-basket" title="Магазин"></i>');
              if (station.has_cafe) services.push('<i class="fas fa-coffee" title="Кафе"></i>');
              if (station.has_toilet) services.push('<i class="fas fa-restroom" title="Туалет"></i>');
              if (station.has_car_wash) services.push('<i class="fas fa-car-wash" title="Мойка"></i>');

              // Payments
              const payments = [];
              if (station.pay_card) payments.push('Карта');
              if (station.pay_sbp) payments.push('СБП');
              if (station.pay_cash) payments.push('Нал');

              const popupContent = `
                <div class="custom-gas-popup ${closed ? 'is-closed' : ''}">
                  <div class="popup-header" style="background: ${statusColor}">
                    <h4>${station.name}</h4>
                    <div class="popup-availability">${statusTitle}</div>
                  </div>
                  <div class="popup-body">
                    <p class="popup-address"><i class="fas fa-map-marker-alt"></i> ${station.address}</p>
                    
                    <div class="popup-status-row">
                      <div class="status-item">
                        <i class="fas ${queue.icon}" style="color: ${queue.color}"></i>
                        <span>Очередь: <b>${queue.status}</b></span>
                      </div>
                    </div>

                    ${services.length > 0 ? `<div class="popup-services-row">${services.join('')}</div>` : ''}

                    <div class="popup-prices">
                      ${(prices || []).map(p => `
                        <div class="price-item">
                          <span class="fuel">${getFuelName(p.fuel_type)}</span>
                          <div class="price-details">
                            <span class="value">${p.price} ₽</span>
                            <span class="avail ${getFuelAvailability(fuel_statuses, p.fuel_type) === 'Закончился' ? 'out' : ''}">
                              ${getFuelAvailability(fuel_statuses, p.fuel_type)}
                            </span>
                          </div>
                        </div>`).join('')}
                    </div>
                  </div>
                  <div class="popup-footer">
                    <div class="popup-payments-row">${payments.join(' • ')}</div>
                    <span>Обновлено: ${new Date(station.last_transaction_at).toLocaleDateString('ru-RU')}</span>
                  </div>
                </div>
              `;
              
              marker.bindPopup(popupContent);
              markersRef.current[station.id] = marker;

              marker.on('click', () => {
                setSelectedStationId(station.id);
                const element = document.getElementById(`station-${station.id}`);
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
              });
            }
          });
        }
      } catch (err) {
        console.error('Error initializing map markers:', err);
      }
    };

    if (!(window as any).DG) {
      const script = document.createElement('script');
      script.src = 'https://maps.api.2gis.ru/2.0/loader.js?pkg=full';
      script.async = true;
      script.onload = () => {
        (window as any).DG.then(initMap);
      };
      document.head.appendChild(script);
    } else {
      (window as any).DG.then(initMap);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [stations]);

  const handleStationClick = (item: StationData) => {
    const { station } = item;
    setSelectedStationId(station.id);
    if (mapRef.current && station.lat && station.lng) {
      mapRef.current.setView([station.lat, station.lng], 15);
      
      const marker = markersRef.current[station.id];
      if (marker) {
        marker.openPopup();
      }
    }
  };

  const toggleFuelFilter = (fuel: string) => {
    setFilterFuel(prev => 
      prev.includes(fuel) ? prev.filter(f => f !== fuel) : [...prev, fuel]
    );
  };

  return (
    <div className="gas-map-container overflow-hidden">
      <div className="gas-sidebar">
        <div className="sidebar-search">
          <input 
            type="text" 
            placeholder="Поиск АЗС..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="sidebar-filters">
          <div className="filter-group">
            <div className="filter-label">Топливо:</div>
            <div className="filter-buttons">
              {['AI_92', 'AI_95', 'DT', 'GAS'].map(type => (
                <button 
                  key={type}
                  onClick={() => toggleFuelFilter(type)}
                  className={`filter-btn btn-sm ${filterFuel.includes(type) ? 'active' : ''}`}
                >
                  {getFuelName(type)}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <div className="filter-label">Очередь:</div>
            <div className="filter-buttons">
              <button 
                onClick={() => setFilterQueue(filterQueue === 'SMALL' ? 'ALL' : 'SMALL')}
                className={`filter-btn btn-sm ${filterQueue === 'SMALL' ? 'active' : ''}`}
                title="Маленькая очередь"
              >
                <i className="fas fa-bolt me-1"></i> Быстро
              </button>
              <button 
                onClick={() => setFilterQueue(filterQueue === 'LARGE' ? 'ALL' : 'LARGE')}
                className={`filter-btn btn-sm ${filterQueue === 'LARGE' ? 'active' : ''}`}
                title="Большая очередь"
              >
                <i className="fas fa-users me-1"></i> Очередь
              </button>
            </div>
          </div>

          <div className="filter-group">
            <div className="filter-buttons row g-2">
              <div className="col-6">
                <button 
                  onClick={() => setFilterToilet(!filterToilet)}
                  className={`filter-btn btn-sm w-100 ${filterToilet ? 'active' : ''}`}
                >
                  <i className="fas fa-restroom me-1"></i> Туалет
                </button>
              </div>
              <div className="col-6">
                <button 
                  onClick={() => setFilterCanister(!filterCanister)}
                  className={`filter-btn btn-sm w-100 ${filterCanister ? 'active' : ''}`}
                >
                  <i className="fas fa-fill-drip me-1"></i> Канистра
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="sidebar-list">
          {filteredStations.map(item => {
            const { station, prices, fuel_statuses, queue_level, closed } = item;
            const queue = getQueueInfo(queue_level);
            const statusTitle = closed ? 'Закрыто' : (queue.status || 'Открыто');

            return (
              <div 
                key={station.id}
                id={`station-${station.id}`}
                onClick={() => handleStationClick(item)}
                className={`station-item ${selectedStationId === station.id ? 'active' : ''} ${closed ? 'is-closed' : ''}`}
              >
                <div className="station-info">
                  <div className="station-header">
                    <h5 className="station-name">{station.name}</h5>
                    <div className="availability-badge">
                      {statusTitle}
                    </div>
                  </div>
                  <p className="station-address">{station.address}</p>
                  
                  <div className="station-meta">
                    <span className="meta-item">
                      <i className={`fas ${queue.icon}`} style={{ color: queue.color, fontSize: '10px', marginRight: '4px' }}></i>
                      {queue.status}
                    </span>
                    <span className="meta-divider">|</span>
                    <span className="meta-item">{new Date(station.last_transaction_at).toLocaleDateString('ru-RU')}</span>
                  </div>

                  <div className="station-prices">
                    {(prices || []).map(p => (
                      <div key={p.fuel_type} className="price-tag">
                        <span className="fuel-type">{getFuelName(p.fuel_type)}</span>
                        <span className="price-val">{p.price} ₽</span>
                        <span className={`fuel-avail ${getFuelAvailability(fuel_statuses, p.fuel_type) === 'Закончился' ? 'out' : ''}`}>
                          {getFuelAvailability(fuel_statuses, p.fuel_type)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="station-services mt-2">
                    {station.has_shop && <i className="fas fa-shopping-basket me-2 text-muted" title="Магазин"></i>}
                    {station.has_cafe && <i className="fas fa-coffee me-2 text-muted" title="Кафе"></i>}
                    {station.has_toilet && <i className="fas fa-restroom me-2 text-muted" title="Туалет"></i>}
                    {station.has_car_wash && <i className="fas fa-car-wash me-2 text-muted" title="Мойка"></i>}
                  </div>
                </div>
              </div>
            );
          })}
          {filteredStations.length === 0 && (
            <div className="no-results">
              Ничего не найдено
            </div>
          )}
        </div>
      </div>
      <div className="map-view">
        <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        .gas-map-container {
          display: flex;
          height: 750px;
          background: #fff;
          position: relative;
          z-index: 1;
        }
        .gas-sidebar {
          width: 350px;
          display: flex;
          flex-direction: column;
          border-right: 1px solid #eee;
          z-index: 10;
          background: #fff;
        }
        .sidebar-search {
          padding: 15px;
          border-bottom: 1px solid #eee;
        }
        .search-input {
          width: 100%;
          padding: 8px 12px;
          border-radius: 6px;
          border: 1px solid #ddd;
          font-size: 14px;
        }
        .sidebar-filters {
          padding: 12px 15px;
          border-bottom: 1px solid #eee;
          background: #f9fafb;
        }
        .filter-group {
          margin-bottom: 10px;
        }
        .filter-group:last-child {
          margin-bottom: 0;
        }
        .filter-label {
          font-size: 12px;
          font-weight: 700;
          margin-bottom: 5px;
          color: #4b5563;
        }
        .filter-buttons {
          display: flex;
          gap: 5px;
          flex-wrap: wrap;
        }
        .filter-btn {
          background: #fff;
          border: 1px solid #d1d5db;
          color: #4b5563;
          border-radius: 6px;
          padding: 4px 10px;
          font-size: 12px;
          font-weight: 600;
          transition: all 0.2s;
          cursor: pointer;
        }
        .filter-btn:hover {
          border-color: #F5B754;
          background: #fffcf5;
        }
        .filter-btn.active {
          background: #F5B754;
          border-color: #F5B754;
          color: #000;
        }
        .sidebar-list {
          flex: 1;
          overflow-y: auto;
        }
        .station-item {
          padding: 15px;
          border-bottom: 1px solid #eee;
          cursor: pointer;
          transition: background 0.2s;
        }
        .station-item:hover {
          background: #f9fafb;
        }
        .station-item.active {
          background: #eff6ff;
          border-left: 4px solid #F5B754;
          padding-left: 11px;
        }
        .station-item.is-closed {
          opacity: 0.7;
          background: #fdfdfd;
        }
        .station-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 5px;
        }
        .station-name {
          margin: 0;
          font-size: 15px;
          font-weight: 700;
          color: #111;
        }
        .availability-badge {
          background: #dcfce7;
          color: #166534;
          font-size: 10px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 4px;
          text-transform: uppercase;
          white-space: nowrap;
        }
        .station-item.is-closed .availability-badge {
          background: #fee2e2;
          color: #dc2626;
        }
        .station-address {
          margin: 0 0 10px 0;
          font-size: 12px;
          color: #666;
          line-height: 1.4;
        }
        .station-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
          font-size: 11px;
          color: #888;
        }
        .meta-divider {
          color: #eee;
        }
        .station-prices {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .price-tag {
          background: #f3f4f6;
          border-radius: 4px;
          padding: 3px 8px;
          font-size: 11px;
          display: flex;
          flex-direction: column;
        }
        .fuel-type {
          font-weight: 700;
          color: #4b5563;
          font-size: 9px;
          text-transform: uppercase;
        }
        .price-val {
          color: #000;
          font-weight: 700;
        }
        .fuel-avail {
          font-size: 9px;
          color: #059669;
        }
        .fuel-avail.out {
          color: #dc2626;
        }
        .map-view {
          flex: 1;
          height: 100%;
        }
        .no-results {
          padding: 20px;
          text-align: center;
          color: #666;
        }

        .leaflet-popup-content-wrapper, .dg-popup-content-wrapper { 
          border-radius: 8px;
          padding: 0;
          overflow: hidden;
        }
        .leaflet-popup-content, .dg-popup-content { 
          margin: 0 !important;
          width: auto !important;
        }
        .custom-gas-popup {
          font-family: sans-serif;
          min-width: 200px;
        }
        .popup-header {
          padding: 10px 15px;
          color: #fff;
        }
        .popup-header h4 {
          margin: 0;
          font-size: 14px;
          font-weight: 700;
        }
        .popup-availability {
          font-size: 10px;
          font-weight: 700;
          opacity: 0.9;
          text-transform: uppercase;
        }
        .popup-body {
          padding: 12px 15px;
        }
        .popup-address {
          font-size: 12px;
          color: #444;
          margin-bottom: 10px;
        }
        .popup-status-row {
          font-size: 11px;
          margin-bottom: 8px;
        }
        .popup-services-row {
          display: flex;
          gap: 8px;
          margin-bottom: 10px;
          font-size: 14px;
          color: #666;
        }
        .popup-prices {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .price-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
          border-bottom: 1px solid #f3f4f6;
          padding-bottom: 4px;
        }
        .price-item:last-child {
          border-bottom: none;
        }
        .price-item .fuel {
          font-weight: 700;
          color: #4b5563;
        }
        .price-details {
          text-align: right;
        }
        .price-details .value {
          font-weight: 700;
          display: block;
        }
        .price-details .avail {
          font-size: 9px;
        }
        .popup-footer {
          padding: 8px 15px;
          background: #f9fafb;
          border-top: 1px solid #eee;
          font-size: 10px;
          color: #888;
        }
        .popup-payments-row {
          margin-bottom: 2px;
          font-weight: 600;
          color: #666;
        }

        @media (max-width: 767px) {
          .gas-map-container {
            flex-direction: column;
            height: 800px;
          }
          .gas-sidebar {
            width: 100%;
            height: 400px;
            border-right: none;
            border-bottom: 1px solid #eee;
          }
        }
      `}} />
    </div>
  );
};

export default GasMap;
