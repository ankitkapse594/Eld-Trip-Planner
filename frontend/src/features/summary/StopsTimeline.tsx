import React from "react";
import type { TripStop } from "../../types/trip";
import { Fuel, Moon, Coffee, RefreshCw, Flag, MapPin, Package, Clock } from "lucide-react";

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
        return <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />;
      case "pickup":
        return <Package className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
      case "dropoff":
        return <Flag className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />;
      case "fuel":
        return <Fuel className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />;
      case "break":
        return <Coffee className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />;
      case "rest":
        return <Moon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />;
      case "restart":
        return <RefreshCw className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />;
      default:
        return <MapPin className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const getBadgeStyle = (type: string) => {
    switch (type) {
      case "origin":
        return "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/20";
      case "pickup":
        return "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20";
      case "dropoff":
        return "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-500/20";
      case "fuel":
        return "bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-500/20";
      case "break":
        return "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/20";
      case "rest":
        return "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/20";
      case "restart":
        return "bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/20";
      default:
        return "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700";
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-card transition-colors space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Trip Schedule &amp; Stops</span>
            <span className="text-xs font-mono font-normal text-slate-500 dark:text-slate-400">
              ({stops.length} stops)
            </span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Chronological itinerary with required HOS breaks
          </p>
        </div>
        <span className="text-[11px] text-slate-400 hidden sm:inline">
          Click stop to view on map
        </span>
      </div>

      <div className="relative pl-6 space-y-3 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
        {stops.map((st) => {
          const isSelected = st.id === selectedStopId;
          const badgeClass = getBadgeStyle(st.type);

          return (
            <div
              key={st.id}
              onClick={() => onSelectStop(st.id)}
              className={`relative cursor-pointer p-3 rounded-xl border transition-all ${
                isSelected
                  ? "bg-blue-50/70 dark:bg-blue-900/20 border-blue-400 dark:border-blue-500/50 shadow-sm"
                  : "bg-slate-50/60 dark:bg-slate-950/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40"
              }`}
            >
              {/* Timeline indicator node */}
              <div
                className={`absolute -left-[27px] top-3.5 w-4 h-4 rounded-full border-2 transition flex items-center justify-center bg-white dark:bg-slate-950 ${
                  isSelected
                    ? "border-blue-600 dark:border-blue-400 scale-110"
                    : "border-slate-300 dark:border-slate-700"
                }`}
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full ${
                    isSelected ? "bg-blue-600 dark:bg-blue-400" : "bg-slate-400 dark:bg-slate-600"
                  }`}
                />
              </div>

              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
                    {getStopIcon(st.type)}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {st.label}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {st.location.label} &bull;{" "}
                      <span className="font-mono">Mile {st.mile_marker.toFixed(1)}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${badgeClass}`}>
                    {st.duration_minutes > 0 ? `${st.duration_minutes}m` : "Depart"}
                  </span>
                  <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1 justify-end">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{st.arrive.slice(11, 16)} &rarr; {st.depart.slice(11, 16)}</span>
                  </div>
                </div>
              </div>

              {st.note && (
                <p className="mt-2 text-[11px] text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200/80 dark:border-slate-800">
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
