import React, { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { RouteData, TripStop } from "../../types/trip";

interface RouteMapProps {
  route: RouteData | null;
  stops: TripStop[];
  selectedStopId: string | null;
  onSelectStop: (stopId: string) => void;
}

// Controller component to smoothly fit bounds and fly to selected stop
const MapController: React.FC<{
  geometry: [number, number][];
  selectedStop: TripStop | null;
}> = ({ geometry, selectedStop }) => {
  const map = useMap();
  const prevGeometryRef = useRef<[number, number][] | null>(null);

  useEffect(() => {
    map.invalidateSize();
    const timer = setTimeout(() => map.invalidateSize(), 300);
    return () => clearTimeout(timer);
  }, [map, geometry]);

  useEffect(() => {
    if (geometry && geometry.length > 0 && geometry !== prevGeometryRef.current) {
      prevGeometryRef.current = geometry;
      const bounds = L.latLngBounds(geometry.map((pt) => [pt[0], pt[1]]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [geometry, map]);

  useEffect(() => {
    if (selectedStop) {
      map.flyTo([selectedStop.location.lat, selectedStop.location.lng], 12, {
        duration: 1.0,
      });
    }
  }, [selectedStop, map]);

  return null;
};

// Create clean, minimalist markers for each stop type
const createStopIcon = (type: string, isSelected: boolean) => {
  let bgColor = "#3B82F6"; // Blue default
  let symbol = "•";

  if (type === "origin") {
    bgColor = "#2563EB"; // Blue
    symbol = "A";
  } else if (type === "pickup") {
    bgColor = "#059669"; // Emerald
    symbol = "B";
  } else if (type === "dropoff") {
    bgColor = "#E11D48"; // Rose/Red
    symbol = "C";
  } else if (type === "fuel") {
    bgColor = "#0D9488"; // Teal
    symbol = "⛽";
  } else if (type === "break") {
    bgColor = "#64748B"; // Slate
    symbol = "☕";
  } else if (type === "rest") {
    bgColor = "#4F46E5"; // Indigo
    symbol = "🛌";
  } else if (type === "restart") {
    bgColor = "#7C3AED"; // Purple
    symbol = "34h";
  }

  const ringStyle = isSelected
    ? `box-shadow: 0 0 0 4px ${bgColor}40, 0 4px 12px rgba(0,0,0,0.25); transform: scale(1.15);`
    : "box-shadow: 0 2px 6px rgba(0,0,0,0.18);";

  const isTextSymbol = symbol === "A" || symbol === "B" || symbol === "C" || symbol === "34h";

  const html = `
    <div style="
      background: ${bgColor};
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${isTextSymbol ? "11px" : "13px"};
      font-weight: 700;
      font-family: system-ui, sans-serif;
      color: white;
      border: 2px solid #ffffff;
      transition: all 0.15s ease-in-out;
      cursor: pointer;
      ${ringStyle}
    ">
      ${symbol}
    </div>
  `;

  return L.divIcon({
    html,
    className: "custom-stop-div-icon",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
};

export const RouteMap: React.FC<RouteMapProps> = ({
  route,
  stops,
  selectedStopId,
  onSelectStop,
}) => {
  const selectedStop = stops.find((s) => s.id === selectedStopId) || null;
  const defaultCenter: [number, number] = [39.8283, -98.5795]; // Center of USA

  // Split route geometry into Leg 1 (Origin -> Pickup) and Leg 2 (Pickup -> Dropoff)
  const pickupStop = stops.find((s) => s.type === "pickup");
  let leg1Geometry: [number, number][] = [];
  let leg2Geometry: [number, number][] = [];

  if (route && route.geometry.length > 0) {
    if (pickupStop && route.geometry.length > 2) {
      let minDist = Infinity;
      let splitIdx = 0;
      route.geometry.forEach((pt, idx) => {
        const d = Math.hypot(pt[0] - pickupStop.location.lat, pt[1] - pickupStop.location.lng);
        if (d < minDist) {
          minDist = d;
          splitIdx = idx;
        }
      });
      leg1Geometry = route.geometry.slice(0, splitIdx + 1);
      leg2Geometry = route.geometry.slice(splitIdx);
    } else {
      leg1Geometry = route.geometry;
    }
  }

  return (
    <div className="w-full h-full min-h-[380px] lg:min-h-[480px] rounded-2xl overflow-hidden border border-slate-200/90 dark:border-slate-800 shadow-card relative bg-slate-100 dark:bg-slate-900">
      <MapContainer
        center={defaultCenter}
        zoom={4}
        scrollWheelZoom={true}
        className="w-full h-full"
        style={{ height: "100%", minHeight: "460px", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {route && <MapController geometry={route.geometry} selectedStop={selectedStop} />}

        {/* Leg 1 (Origin -> Pickup): Blue route */}
        {leg1Geometry.length > 0 && (
          <Polyline
            positions={leg1Geometry}
            pathOptions={{
              color: "#2563EB",
              weight: 4,
              opacity: 0.9,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        )}

        {/* Leg 2 (Pickup -> Dropoff): Emerald loaded freight route */}
        {leg2Geometry.length > 0 && (
          <Polyline
            positions={leg2Geometry}
            pathOptions={{
              color: "#059669",
              weight: 4.5,
              opacity: 0.95,
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        )}

        {/* Interactive Stop Markers */}
        {stops.map((stop) => {
          const isSelected = stop.id === selectedStopId;
          const icon = createStopIcon(stop.type, isSelected);

          return (
            <Marker
              key={stop.id}
              position={[stop.location.lat, stop.location.lng]}
              icon={icon}
              eventHandlers={{
                click: () => onSelectStop(stop.id),
              }}
            >
              <Popup>
                <div className="p-1 max-w-[220px] text-xs">
                  <div className="font-semibold text-slate-900 dark:text-white flex items-center justify-between gap-2">
                    <span>{stop.label}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {stop.duration_minutes > 0 ? `${stop.duration_minutes}m` : "Depart"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {stop.location.label}
                  </p>
                  <div className="mt-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-[10px] font-mono text-slate-500 flex justify-between">
                    <span>Mile {stop.mile_marker.toFixed(1)}</span>
                    <span>{stop.arrive.slice(11, 16)} &rarr; {stop.depart.slice(11, 16)}</span>
                  </div>
                  {stop.note && (
                    <p className="mt-1 text-[10px] text-slate-600 dark:text-slate-300 italic">
                      {stop.note}
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Clean Floating Map Legend */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border border-slate-200/90 dark:border-slate-800 rounded-xl px-3 py-1.5 shadow-sm text-[11px] flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-1 bg-blue-600 rounded-full inline-block"></span>
          <span className="text-slate-600 dark:text-slate-300 font-medium">To Pickup</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-1 bg-emerald-600 rounded-full inline-block"></span>
          <span className="text-slate-600 dark:text-slate-300 font-medium">Loaded</span>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-slate-400">
          <span>&bull;</span>
          <span className="text-slate-500 dark:text-slate-400">A: Start</span>
          <span className="text-slate-500 dark:text-slate-400">B: Pickup</span>
          <span className="text-slate-500 dark:text-slate-400">C: Dropoff</span>
        </div>
      </div>
    </div>
  );
};
