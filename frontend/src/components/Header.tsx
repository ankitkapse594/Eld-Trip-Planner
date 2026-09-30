import React from "react";
import { ShieldCheck, Truck, Clock } from "lucide-react";

interface HeaderProps {
  hosValid?: boolean;
  totalMiles?: number;
}

export const Header: React.FC<HeaderProps> = ({ hosValid, totalMiles }) => {
  return (
    <header className="no-print border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
          <Truck className="w-5 h-5 text-slate-950 font-bold" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              ELD Trip Planner
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-slate-700">
                FMCSR § 395
              </span>
            </h1>
          </div>
          <p className="text-xs text-slate-400 hidden sm:block">
            Commercial Property Carrier HOS Route Dispatch &amp; Paper Log Sheet Generator
          </p>
          <p className="text-[11px] text-slate-400 sm:hidden">
            HOS Route Dispatch &amp; Log Generator
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {totalMiles !== undefined && (
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs font-mono">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-300">Total Route:</span>
            <span className="font-bold text-amber-400">{totalMiles.toLocaleString()} mi</span>
          </div>
        )}

        {hosValid !== undefined && (
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
              hosValid
                ? "bg-teal-500/10 text-teal-400 border-teal-500/30"
                : "bg-red-500/10 text-red-400 border-red-500/30"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{hosValid ? "100% FMCSA Compliant" : "Violations Detected"}</span>
          </div>
        )}
      </div>
    </header>
  );
};
