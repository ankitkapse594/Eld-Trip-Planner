import React from "react";
import type { TripStop } from "../../types/trip";
import { Fuel, Moon, Coffee, RefreshCw, Flag, MapPin, Package } from "lucide-react";

interface StopsTimelineProps {
  stops: TripStop[];
  selectedStopId: string | null;
  onSelectStop: (stopId: string) => void;
}

export const StopsTimeline: React.FC<StopsTimelineProps> = ({
  stops,
  selectedStopId,
  onSelectStop,
}) => {
  const getStopIcon = (type: string) => {
    switch (type) {
      case "origin":
        return <MapPin className="w-4 h-4 text-blue-400" />;
      case "pickup":
        return <Package className="w-4 h-4 text-emerald-400" />;
      case "dropoff":
        return <Flag className="w-4 h-4 text-red-400" />;
      case "fuel":
        return <Fuel className="w-4 h-4 text-teal-400" />;
      case "break":
        return <Coffee className="w-4 h-4 text-amber-400" />;
      case "rest":
        return <Moon className="w-4 h-4 text-indigo-400" />;
      case "restart":
        return <RefreshCw className="w-4 h-4 text-purple-400" />;
      default:
        return <MapPin className="w-4 h-4 text-slate-400" />;
    }
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case "origin":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "pickup":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "dropoff":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      case "fuel":
        return "bg-teal-500/10 text-teal-400 border-teal-500/20";
      case "break":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      case "rest":
        return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
      case "restart":
        return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      default:
        return "bg-slate-800 text-slate-400 border-slate-700";
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <span>Stops &amp; Rest Timeline</span>
          <span className="text-xs font-mono font-normal text-slate-400">({stops.length} points)</span>
        </h3>
        <span className="text-[11px] text-slate-500">Click any stop to fly on map</span>
      </div>

      <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
        {stops.map((st) => {
          const isSelected = st.id === selectedStopId;
          const badgeClass = getBadgeColor(st.type);

          return (
            <div
              key={st.id}
              onClick={() => onSelectStop(st.id)}
              className={`relative cursor-pointer group p-3 rounded-xl border transition-all ${
                isSelected
                  ? "bg-slate-800/90 border-amber-500 shadow-glow-amber"
                  : "bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40"
              }`}
            >
              {/* Timeline Dot */}
              <div
                className={`absolute -left-[27px] top-3.5 w-4 h-4 rounded-full border-2 transition flex items-center justify-center bg-slate-950 ${
                  isSelected ? "border-amber-400 scale-125" : "border-slate-700 group-hover:border-slate-500"
                }`}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    isSelected ? "bg-amber-400" : "bg-slate-600"
                  }`}
                />
              </div>

              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-lg bg-slate-800 border border-slate-700">
                    {getStopIcon(st.type)}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition">
                      {st.label}
                    </h4>
                    <p className="text-[11px] text-slate-300 flex items-center gap-1.5">
                      <span className="truncate max-w-[200px]">{st.location.label}</span>
                      <span className="font-mono text-slate-500 text-[10px]">&bull; Mile {st.mile_marker.toFixed(1)}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${badgeClass}`}>
                    {st.duration_minutes > 0 ? `${st.duration_minutes}m` : "Depart"}
                  </span>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                    {st.arrive.slice(11, 16)} &rarr; {st.depart.slice(11, 16)}
                  </div>
                </div>
              </div>

              {st.note && (
                <p className="mt-2 text-[11px] text-slate-400 italic bg-slate-900/60 p-2 rounded-lg border border-slate-800/60">
                  {st.note}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
