import React, { useEffect, useRef, useState, useMemo } from "react";

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
  bounds?: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  };
}

const MAX_STATION_AGE_MS = 24 * 60 * 60 * 1000;
const FUEL_LIMIT_OPTIONS = [10, 20, 30, 40] as const;

const isStationDataFresh = (station: StationData, now = Date.now()) => {
  const updatedAt = Date.parse(station.station?.last_transaction_at);
  return Number.isFinite(updatedAt) && now - updatedAt <= MAX_STATION_AGE_MS;
};

const GasMap: React.FC<GasMapProps> = ({ stations: initialStations, bounds }) => {
  const [stations, setStations] = useState(initialStations);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStationId, setSelectedStationId] = useState<string | null>(
    null,
  );
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Filters State
  const [filterFuel, setFilterFuel] = useState<string[]>([]);
  const [filterCanister, setFilterCanister] = useState(false);
  const [filterLimit, setFilterLimit] = useState<number | null>(null);
  const [filterQueue, setFilterQueue] = useState<"ALL" | "SMALL" | "LARGE">(
    "ALL",
  );

  useEffect(() => {
    if (!bounds) return;

    const refreshInterval = setInterval(async () => {
      try {
        const { minLat, maxLat, minLon, maxLon } = bounds;
        const response = await fetch(
          `https://benzin.api.2gis.ru/api/v1/stations?minLat=${minLat}&maxLat=${maxLat}&minLon=${minLon}&maxLon=${maxLon}`,
        );
        if (response.ok) {
          const newData = await response.json();
          setStations(newData);
        }
      } catch (error) {
        console.error("Error auto-refreshing gas data:", error);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(refreshInterval);
  }, [bounds]);

  const getQueueInfo = (level: string) => {
    switch (level) {
      case "NONE":
        return {
          status: "Свободно",
          color: "#059669",
          icon: "fa-check-circle",
        };
      case "UP_TO_25":
      case "FROM_10_TO_25":
        // Маленькая очередь — предупреждающий цвет
        return {
          status: "Маленькая очередь",
          color: "#f59e0b",
          icon: "fa-exclamation-circle",
        };
      case "FROM_25_TO_50":
        // Средняя очередь — усиленное предупреждение
        return {
          status: "Средняя очередь",
          color: "#ea580c",
          icon: "fa-exclamation-triangle",
        };
      case "OVER_50":
        // Большая очередь — красный
        return {
          status: "Большая очередь",
          color: "#dc2626",
          icon: "fa-exclamation-triangle",
        };
      default:
        return {
          status: "Нет данных",
          color: "#999",
          icon: "fa-question-circle",
        };
    }
  };

  const getFuelName = (type: string) => {
    switch (type) {
      case "AI_92":
        return "92";
      case "AI_95":
        return "95";
      case "AI_98":
        return "98";
      case "AI_100":
        return "100";
      case "DT":
        return "ДТ";
      case "GAS":
        return "Газ";
      default:
        return type;
    }
  };

  const getFuelAvailability = (
    fuelStatuses: FuelStatus[] | undefined,
    fuelType: string,
  ) => {
    if (!fuelStatuses) return "В наличии";
    const status = fuelStatuses.find((s) => s.fuel_type === fuelType);
    if (!status) return "В наличии";
    if (status.available === false) return "Закончился";
    if (status.limit_liters && status.limit_liters > 0)
      return `Лимит ${status.limit_liters}л`;
    return "В наличии";
  };

  const filteredStations = useMemo(() => {
    if (!Array.isArray(stations)) return [];
    const now = Date.now();
    return stations.filter((s) => {
      if (!isStationDataFresh(s, now)) return false;

      // Search match
      const matchesSearch =
        s.station?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.station?.address?.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Fuel filter
      if (filterFuel.length > 0) {
        const hasFuel = s.prices?.some((p) => filterFuel.includes(p.fuel_type));
        if (!hasFuel) return false;
      }

      // Fuel limit filter
      if (filterLimit !== null) {
        const hasLimit = s.fuel_statuses?.some(
          (status) =>
            status.available !== false &&
            status.limit_liters === filterLimit &&
            (filterFuel.length === 0 || filterFuel.includes(status.fuel_type)),
        );
        if (!hasLimit) return false;
      }

      // Canister filter
      if (filterCanister && !s.can_use_canister) return false;

      // Queue filter
      if (filterQueue === "SMALL") {
        if (!["NONE", "UP_TO_25", "FROM_10_TO_25"].includes(s.queue_level))
          return false;
      } else if (filterQueue === "LARGE") {
        if (!["FROM_25_TO_50", "OVER_50"].includes(s.queue_level)) return false;
      }

      return true;
    });
  }, [
    stations,
    searchQuery,
    filterFuel,
    filterLimit,
    filterCanister,
    filterQueue,
  ]);

  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    const initMap = () => {
      const DG = (window as any).DG;
      if (!DG || !mapContainerRef.current) return;

      if (mapRef.current) {
        mapRef.current.remove();
        markersRef.current = {};
      }

      try {
        const centerLat = bounds ? (bounds.minLat + bounds.maxLat) / 2 : 57.1522;
        const centerLng = bounds ? (bounds.minLon + bounds.maxLon) / 2 : 65.5272;

        const map = DG.map(mapContainerRef.current, {
          center: [centerLat, centerLng],
          zoom: bounds ? 11 : 12,
          zoomControl: true,
          fullscreenControl: false,
        });
        mapRef.current = map;

        // On-brand fuel-pump pin marker (site colors: gold #F5B754 + dark #111827)
        const svg = [
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
          "</svg>",
        ].join("");
        const gasIcon = DG.icon({
          iconUrl: "data:image/svg+xml;base64," + btoa(svg),
          iconSize: [40, 50],
          iconAnchor: [20, 50],
          popupAnchor: [0, -48],
        });

        if (Array.isArray(filteredStations)) {
          filteredStations.forEach((item) => {
            const { station, prices, fuel_statuses, queue_level, closed } =
              item;
            if (!station) return;

            const lat = station.lat;
            const lng = station.lng;

            if (lat && lng) {
              const marker = DG.marker([lat, lng], { icon: gasIcon }).addTo(
                map,
              );

              const queue = getQueueInfo(queue_level);
              const statusColor = closed ? "#dc2626" : queue.color || "#05B958";
              const statusTitle = closed
                ? "Закрыто"
                : queue.status || "Открыто";

              // Services
              const services = [];
              if (station.has_shop)
                services.push(
                  '<span class="svc-ico" data-tip="Магазин"><i class="fas fa-shopping-basket"></i></span>',
                );
              if (station.has_cafe)
                services.push(
                  '<span class="svc-ico" data-tip="Кафе"><i class="fas fa-coffee"></i></span>',
                );
              if (station.has_toilet)
                services.push(
                  '<span class="svc-ico" data-tip="Туалет"><i class="fas fa-restroom"></i></span>',
                );
              if (station.has_car_wash)
                services.push(
                  '<span class="svc-ico" data-tip="Мойка"><i class="fas fa-car-wash"></i></span>',
                );

              // Payments
              const payments = [];
              if (station.pay_card) payments.push("Карта");
              if (station.pay_sbp) payments.push("СБП");
              if (station.pay_cash) payments.push("Нал");

              const popupContent = `
                <div class="custom-gas-popup ${closed ? "is-closed" : ""}">
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

                    ${services.length > 0 ? `<div class="popup-services-row">${services.join("")}</div>` : ""}

                    <div class="popup-prices">
                      ${(prices || [])
                        .map(
                          (p) => `
                        <div class="price-item">
                          <span class="fuel">${getFuelName(p.fuel_type)}</span>
                          <div class="price-details">
                            <span class="value">${p.price} ₽</span>
                            <span class="avail ${getFuelAvailability(fuel_statuses, p.fuel_type) === "Закончился" ? "out" : ""}">
                              ${getFuelAvailability(fuel_statuses, p.fuel_type)}
                            </span>
                          </div>
                        </div>`,
                        )
                        .join("")}
                    </div>
                  </div>
                  <div class="popup-footer">
                    <div class="popup-payments-row">${payments.join(" • ")}</div>
                    <span>Обновлено: ${new Date(station.last_transaction_at).toLocaleDateString("ru-RU")}</span>
                  </div>
                </div>
              `;

              marker.bindPopup(popupContent);
              markersRef.current[station.id] = marker;

              marker.on("click", () => {
                setSelectedStationId(station.id);
                const element = document.getElementById(
                  `station-${station.id}`,
                );
                if (element) {
                  element.scrollIntoView({
                    behavior: "smooth",
                    block: "nearest",
                  });
                }
              });
            }
          });
        }
      } catch (err) {
        console.error("Error initializing map markers:", err);
      }
    };

    if (!(window as any).DG) {
      const script = document.createElement("script");
      script.src = "https://maps.api.2gis.ru/2.0/loader.js?pkg=full";
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
  }, [filteredStations]);

  const handleStationClick = (item: StationData) => {
    const { station } = item;
    setSelectedStationId(station.id);
    if (mapRef.current && station.lat && station.lng) {
      mapRef.current.setView([station.lat, station.lng], 15);

      const marker = markersRef.current[station.id];
      if (marker) {
        marker.openPopup();
      }

      if (window.matchMedia("(max-width: 767px)").matches) {
        setIsSidebarOpen(false);
      }
    }
  };

  const toggleFuelFilter = (fuel: string) => {
    setFilterFuel((prev) =>
      prev.includes(fuel) ? prev.filter((f) => f !== fuel) : [...prev, fuel],
    );
  };

  return (
    <div className="gas-map-container overflow-hidden">
      <button
        className={`sidebar-backdrop d-md-none ${isSidebarOpen ? "is-visible" : ""}`}
        onClick={() => setIsSidebarOpen(false)}
        type="button"
        aria-label="Закрыть выбор АЗС"
        tabIndex={isSidebarOpen ? 0 : -1}
      />
      <div className={`gas-sidebar ${isSidebarOpen ? "is-open" : ""}`}>
        <button
          className="sidebar-close-btn d-md-none"
          onClick={() => setIsSidebarOpen(false)}
          aria-label="Закрыть сайдбар"
        >
          <i className="fas fa-times"></i>
        </button>
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
              {["AI_92", "AI_95", "DT", "GAS"].map((type) => (
                <button
                  key={type}
                  onClick={() => toggleFuelFilter(type)}
                  className={`filter-btn btn-sm ${filterFuel.includes(type) ? "active" : ""}`}
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
                onClick={() =>
                  setFilterQueue(filterQueue === "SMALL" ? "ALL" : "SMALL")
                }
                className={`filter-btn btn-sm ${filterQueue === "SMALL" ? "active" : ""}`}
                data-tip="Маленькая очередь"
              >
                <i className="fas fa-bolt me-1"></i> Быстро
              </button>
              <button
                onClick={() =>
                  setFilterQueue(filterQueue === "LARGE" ? "ALL" : "LARGE")
                }
                className={`filter-btn btn-sm ${filterQueue === "LARGE" ? "active" : ""}`}
                data-tip="Большая очередь"
              >
                <i className="fas fa-users me-1"></i> Очередь
              </button>
            </div>
          </div>

          <div className="filter-group">
            <div className="filter-label">Лимит:</div>
            <div className="filter-buttons">
              {FUEL_LIMIT_OPTIONS.map((limit) => (
                <button
                  key={limit}
                  onClick={() =>
                    setFilterLimit(filterLimit === limit ? null : limit)
                  }
                  className={`filter-btn btn-sm ${filterLimit === limit ? "active" : ""}`}
                  aria-pressed={filterLimit === limit}
                >
                  {limit} л
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <div className="filter-buttons row g-2">
              <div className="col-6">
                <button
                  onClick={() => setFilterCanister(!filterCanister)}
                  className={`filter-btn btn-sm w-100 ${filterCanister ? "active" : ""}`}
                >
                  <i className="fas fa-fill-drip me-1"></i> Канистра
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="sidebar-list">
          {filteredStations.map((item) => {
            const { station, prices, fuel_statuses, queue_level, closed } =
              item;
            const queue = getQueueInfo(queue_level);
            const statusTitle = closed ? "Закрыто" : queue.status || "Открыто";
            const badgeColor = closed ? "#dc2626" : queue.color;

            return (
              <div
                key={station.id}
                id={`station-${station.id}`}
                onClick={() => handleStationClick(item)}
                className={`station-item ${selectedStationId === station.id ? "active" : ""} ${closed ? "is-closed" : ""}`}
              >
                <div className="station-info">
                  <div className="station-header">
                    <h5 className="station-name">{station.name}</h5>
                    <div
                      className="availability-badge"
                      style={{
                        background: `${badgeColor}1a`,
                        color: badgeColor,
                      }}
                    >
                      {statusTitle}
                    </div>
                  </div>
                  <p className="station-address">{station.address}</p>

                  <div className="station-meta">
                    <span className="meta-item">
                      <i
                        className={`fas ${queue.icon}`}
                        style={{
                          color: queue.color,
                          fontSize: "10px",
                          marginRight: "4px",
                        }}
                      ></i>
                      {queue.status}
                    </span>
                    <span className="meta-divider">|</span>
                    <span className="meta-item">
                      {new Date(station.last_transaction_at).toLocaleDateString(
                        "ru-RU",
                      )}
                    </span>
                  </div>

                  <div className="station-prices">
                    {(prices || []).map((p) => (
                      <div key={p.fuel_type} className="price-tag">
                        <span className="fuel-type">
                          {getFuelName(p.fuel_type)}
                        </span>
                        <span className="price-val">{p.price} ₽</span>
                        <span
                          className={`fuel-avail ${getFuelAvailability(fuel_statuses, p.fuel_type) === "Закончился" ? "out" : ""}`}
                        >
                          {getFuelAvailability(fuel_statuses, p.fuel_type)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="station-services mt-2">
                    {station.has_shop && (
                      <span className="svc-ico" data-tip="Магазин">
                        <i className="fas fa-shopping-basket"></i>
                      </span>
                    )}
                    {station.has_cafe && (
                      <span className="svc-ico" data-tip="Кафе">
                        <i className="fas fa-coffee"></i>
                      </span>
                    )}
                    {station.has_toilet && (
                      <span className="svc-ico" data-tip="Туалет">
                        <i className="fas fa-restroom"></i>
                      </span>
                    )}
                    {station.has_car_wash && (
                      <span className="svc-ico" data-tip="Мойка">
                        <i className="fas fa-car-wash"></i>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {filteredStations.length === 0 && (
            <div className="no-results">Ничего не найдено</div>
          )}
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
        <div ref={mapContainerRef} style={{ height: "100%", width: "100%" }} />
      </div>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .gas-map-container {
          display: flex;
          height: 750px;
          background: transparent;
          position: relative;
          z-index: 1;
          font-family: "Montserrat", sans-serif;
        }

        /* Site-styled hover tooltip (replaces native black title popup) */
        .svc-ico {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 26px;
          height: 26px;
          border-radius: 7px;
          background: #f3f4f6;
          color: #6b7280;
          font-size: 12px;
          margin-right: 6px;
          cursor: default;
          transition: all 0.2s ease;
        }
        .svc-ico:hover {
          background: #F5B754;
          color: #111827;
        }
        [data-tip] {
          position: relative;
        }
        [data-tip]:hover::after {
          content: attr(data-tip);
          position: absolute;
          bottom: calc(100% + 9px);
          left: 50%;
          transform: translateX(-50%);
          background: #111827;
          color: #fff;
          font-family: "Montserrat", sans-serif;
          font-size: 11px;
          font-weight: 600;
          line-height: 1;
          letter-spacing: 0.2px;
          padding: 7px 11px;
          border-radius: 8px;
          white-space: nowrap;
          z-index: 2000;
          box-shadow: 0 8px 22px rgba(0, 0, 0, 0.28);
          border-bottom: 2px solid #F5B754;
          pointer-events: none;
        }
        [data-tip]:hover::before {
          content: "";
          position: absolute;
          bottom: calc(100% + 3px);
          left: 50%;
          transform: translateX(-50%);
          border: 6px solid transparent;
          border-top-color: #111827;
          z-index: 2000;
          pointer-events: none;
        }
        .gas-sidebar {
          width: 350px;
          display: flex;
          flex-direction: column;
          border-right: 1px solid #eee;
          z-index: 10;
          background: #fff;
          transition: transform 0.3s ease;
        }
        .sidebar-backdrop {
          display: none;
        }
        .sidebar-close-btn {
          position: absolute;
          top: 15px;
          right: 15px;
          background: none;
          border: none;
          font-size: 20px;
          color: #666;
          z-index: 100;
          cursor: pointer;
          display: none;
        }
        .sidebar-toggle-btn {
          position: absolute;
          top: 15px;
          left: 15px;
          z-index: 99;
          background: #F5B754;
          color: #111827;
          border: none;
          border-radius: 8px;
          padding: 10px 16px;
          font-weight: 700;
          font-size: 14px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          display: none;
          align-items: center;
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
          width: 100%;
          gap: 5px;
          flex-wrap: nowrap;
        }
        .filter-buttons > .filter-btn {
          min-width: 0;
          flex: 1 1 0;
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

        .leaflet-popup-content-wrapper,
        .dg-popup-content-wrapper,
        .dg-popup__content,
        .dg-popup__contentWrapper,
        [class*="dg-popup"] [class*="content"] { 
          border-radius: 8px;
          padding: 0;
          overflow: hidden;
          background: #ffffff !important;
          color: #111827 !important;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18);
        }
        /* Force white background for the whole 2GIS popup shell */
        .leaflet-popup,
        .dg-popup,
        [class*="dg-popup"] {
          background: transparent !important;
        }
        .dg-popup__tip,
        [class*="dg-popup"] [class*="tip"] {
          background: #ffffff !important;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.18);
        }
        .leaflet-popup-tip {
          background: #ffffff !important;
        }
        .leaflet-popup-content, .dg-popup-content, .dg-popup__content { 
          margin: 0 !important;
          width: auto !important;
          background: #ffffff !important;
        }
        .custom-gas-popup {
          font-family: "Montserrat", sans-serif;
          min-width: 220px;
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
          gap: 6px;
          margin-bottom: 12px;
          font-size: 12px;
          color: #666;
        }
        .popup-services-row .svc-ico {
          margin-right: 0;
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
            height: clamp(520px, 72vh, 680px);
            position: relative;
          }
          .gas-sidebar {
            position: fixed;
            top: auto;
            bottom: 0;
            left: 0;
            width: 100%;
            height: min(82dvh, 720px);
            transform: translateY(105%);
            border-right: none;
            border-radius: 24px 24px 0 0;
            box-shadow: 0 -16px 50px rgba(0,0,0,0.22);
            z-index: 1100;
            overflow: hidden;
          }
          .gas-sidebar.is-open {
            transform: translateY(0);
          }
          .gas-sidebar::before {
            content: "";
            width: 44px;
            height: 4px;
            margin: 9px auto 0;
            flex: 0 0 auto;
            border-radius: 999px;
            background: #d1d5db;
          }
          .sidebar-backdrop {
            position: fixed;
            inset: 0;
            display: block;
            visibility: hidden;
            opacity: 0;
            border: 0;
            background: rgba(17, 24, 39, 0.48);
            backdrop-filter: blur(2px);
            transition: opacity 0.3s ease, visibility 0.3s ease;
            pointer-events: none;
            z-index: 1090;
          }
          .sidebar-backdrop.is-visible {
            visibility: visible;
            opacity: 1;
            pointer-events: auto;
          }
          .sidebar-close-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 44px;
            height: 44px;
            top: 8px;
            right: 8px;
            border-radius: 50%;
            background: #f3f4f6;
          }
          .sidebar-toggle-btn {
            display: flex;
            min-height: 44px;
            max-width: calc(100% - 30px);
            top: auto;
            bottom: 18px;
            left: 50%;
            transform: translateX(-50%);
            white-space: nowrap;
            border-radius: 999px;
            padding: 12px 22px;
            box-shadow: 0 10px 30px rgba(17, 24, 39, 0.24);
          }
          .map-view {
            width: 100%;
            height: 100%;
          }
          .sidebar-search {
            padding: 12px 64px 12px 12px;
          }
          .search-input {
            min-height: 44px;
            font-size: 16px;
          }
          .sidebar-filters {
            padding: 12px;
          }
          .filter-buttons {
            gap: 8px;
          }
          .filter-btn {
            min-height: 40px;
            padding: 7px 12px;
            font-size: 13px;
          }
          .station-item {
            padding: 14px 12px;
          }
          .station-item.active {
            padding-left: 8px;
          }
          .station-prices {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
          }
          .price-tag {
            min-width: 0;
            padding: 7px 9px;
            border-radius: 7px;
          }
          .custom-gas-popup {
            min-width: min(220px, calc(100vw - 64px));
            max-width: calc(100vw - 64px);
          }
        }
      `,
        }}
      />
    </div>
  );
};

export default GasMap;
