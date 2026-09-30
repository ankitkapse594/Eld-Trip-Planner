import React from "react";
import { Milestone, Clock, Calendar, Fuel, AlertTriangle } from "lucide-react";
import type { TripSummary } from "../../types/trip";

interface SummaryCardsProps {
  summary: TripSummary;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ summary }) => {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Distance */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Total Distance</span>
            <Milestone className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {summary.total_miles.toLocaleString()}{" "}
            <span className="text-xs font-sans text-slate-400 font-normal">mi</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Total route distance</p>
        </div>

        {/* Driving Hours */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Driving Time</span>
            <Clock className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {summary.driving_hours.toFixed(1)}{" "}
            <span className="text-xs font-sans text-slate-400 font-normal">hrs</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">CMV on-road driving</p>
        </div>

        {/* Trip Duration */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Trip Duration</span>
            <Calendar className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {summary.trip_duration_hours.toFixed(1)}{" "}
            <span className="text-xs font-sans text-slate-400 font-normal">hrs</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">{summary.days} Daily Log Sheets</p>
        </div>

        {/* Stops & Rests */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-medium">Stops &amp; Rests</span>
            <Fuel className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-center gap-2 text-xs font-mono font-semibold mt-1">
            <span className="px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20" title="Fuel Stops">
              {summary.fuel_stops} Fuel
            </span>
            <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" title="10-hour Sleeper Berth Rests">
              {summary.rests} Rest
            </span>
            {summary.restarts > 0 && (
              <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20" title="34-hour Restarts">
                {summary.restarts} Restart
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-500 mt-1.5">Scheduled en-route</p>
        </div>
      </div>

      {/* Compliance Alert if violations */}
      {!summary.hos_valid && (
        <div className="bg-red-500/10 border border-red-500/40 rounded-xl p-3 text-xs text-red-300 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-red-200">Hours of Service Non-Compliance Detected</p>
            <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px] text-red-300">
              {summary.violations.map((v, idx) => (
                <li key={idx}>{v}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
