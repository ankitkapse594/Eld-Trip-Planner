import React, { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
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

  // Fit bounds when route geometry changes
  useEffect(() => {
    if (geometry && geometry.length > 0 && geometry !== prevGeometryRef.current) {
      prevGeometryRef.current = geometry;
      const bounds = L.latLngBounds(geometry.map((pt) => [pt[0], pt[1]]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [geometry, map]);

  // Fly to stop when selected
  useEffect(() => {
    if (selectedStop) {
      map.flyTo([selectedStop.location.lat, selectedStop.location.lng], 12, {
        duration: 1.2,
      });
    }
  }, [selectedStop, map]);

  return null;
};

// Create custom colored markers for each stop type
const createStopIcon = (type: string, isSelected: boolean) => {
  let bgColor = "#F5A524"; // Amber default
  let borderColor = "#ffffff";
  let symbol = "📍";

  if (type === "origin") {
    bgColor = "#3B82F6"; // Blue
    symbol = "🏁";
  } else if (type === "pickup") {
    bgColor = "#10B981"; // Emerald
    symbol = "📦";
  } else if (type === "dropoff") {
    bgColor = "#EF4444"; // Red
    symbol = "🎯";
  } else if (type === "fuel") {
    bgColor = "#14B8A6"; // Teal
    symbol = "⛽";
  } else if (type === "break") {
    bgColor = "#64748B"; // Slate
    symbol = "☕";
  } else if (type === "rest") {
    bgColor = "#6366F1"; // Indigo
    symbol = "🛌";
  } else if (type === "restart") {
    bgColor = "#8B5CF6"; // Purple
    symbol = "🔄";
  }

  const ringStyle = isSelected
    ? `box-shadow: 0 0 0 4px ${bgColor}88, 0 8px 16px rgba(0,0,0,0.5); transform: scale(1.2);`
    : "box-shadow: 0 4px 10px rgba(0,0,0,0.4);";

  const html = `
    <div style="
      background: ${bgColor};
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      color: white;
      border: 2px solid ${borderColor};
      transition: all 0.2s ease-in-out;
      ${ringStyle}
    ">
      ${symbol}
    </div>
  `;

  return L.divIcon({
    html,
    className: "custom-stop-div-icon",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
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

  return (
    <div className="w-full h-full min-h-[380px] lg:min-h-[500px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative">
      <MapContainer
        center={defaultCenter}
        zoom={4}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          maxZoom={19}
        />

        {route && <MapController geometry={route.geometry} selectedStop={selectedStop} />}

        {/* Route Polyline: Main Corridor */}
        {route && route.geometry.length > 0 && (
          <>
            {/* Glow / Outline */}
            <Polyline
              positions={route.geometry}
              pathOptions={{
                color: "#F5A524",
                weight: 6,
                opacity: 0.35,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
            {/* Core Route Line */}
            <Polyline
              positions={route.geometry}
              pathOptions={{
                color: "#F5A524",
                weight: 3.5,
                opacity: 0.95,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
          </>
        )}

        {/* Markers for each stop and rest point */}
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
                <div className="p-1 min-w-[200px]">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-white mb-1">
                    <span>{stop.label}</span>
                  </div>
                  <p className="text-[11px] text-slate-300 mb-1">{stop.location.label}</p>
                  <div className="grid grid-cols-2 gap-1 text-[10px] font-mono bg-slate-800/80 p-1.5 rounded border border-slate-700/60 mb-1.5">
                    <div>
                      <span className="text-slate-400 block">Arrive:</span>
                      <span className="text-amber-400 font-semibold">{stop.arrive.slice(11, 16)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Depart:</span>
                      <span className="text-teal-400 font-semibold">{stop.depart.slice(11, 16)}</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 italic">{stop.note}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Map Legend Overlay */}
      <div className="no-print absolute bottom-4 left-4 z-[400] bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-2 text-[10px] text-slate-300 shadow-xl hidden sm:flex items-center gap-3">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span> Origin
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span> Pickup
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span> Dropoff
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-teal-500 inline-block"></span> Fuel
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block"></span> 10h Rest
        </span>
      </div>
    </div>
  );
};
