import React from "react";
import { Route, Clock, Calendar, Fuel, AlertTriangle } from "lucide-react";
import type { TripSummary } from "../../types/trip";

interface SummaryCardsProps {
  summary: TripSummary;
}

export const SummaryCards: React.FC<SummaryCardsProps> = ({ summary }) => {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total Distance */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3.5 shadow-card transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-medium">Total Distance</span>
            <Route className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
            {summary.total_miles.toLocaleString()}{" "}
            <span className="text-xs font-sans text-slate-500 font-normal">mi</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Commercial highway route</p>
        </div>

        {/* Driving Hours */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3.5 shadow-card transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-medium">Driving Time</span>
            <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
            {summary.driving_hours.toFixed(1)}{" "}
            <span className="text-xs font-sans text-slate-500 font-normal">hrs</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">At 55 mph highway avg</p>
        </div>

        {/* Total Trip Duration */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3.5 shadow-card transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-medium">Total Trip Time</span>
            <Calendar className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
            {summary.trip_duration_hours.toFixed(1)}{" "}
            <span className="text-xs font-sans text-slate-500 font-normal">hrs</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {summary.days} {summary.days === 1 ? "Day" : "Daily Log Sheets"}
          </p>
        </div>

        {/* Stops & Rests */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-3.5 shadow-card transition-colors">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-xs font-medium">Mandatory Stops</span>
            <Fuel className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono font-medium mt-1">
            <span className="px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 text-[11px]">
              {summary.fuel_stops} Fuel
            </span>
            <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 text-[11px]">
              {summary.rests} Rest
            </span>
            {summary.restarts > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20 text-[11px]">
                {summary.restarts} Restart
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Scheduled by HOS rules</p>
        </div>
      </div>

      {/* Compliance Alert if violations */}
      {!summary.hos_valid && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl p-3.5 text-xs text-red-800 dark:text-red-300 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900 dark:text-red-200">
              Hours of Service Warning
            </p>
            <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px] text-red-700 dark:text-red-300">
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
