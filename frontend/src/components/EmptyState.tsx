import React from "react";
import { Sparkles, ShieldCheck, MapPin, FileText, ArrowRight } from "lucide-react";

interface EmptyStateProps {
  onFillExample: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onFillExample }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-10 text-center shadow-2xl space-y-6 max-w-2xl mx-auto my-6">
      {/* Truck & Route Illustration Graphic */}
      <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-3xl bg-gradient-to-tr from-amber-500/20 via-slate-800 to-teal-500/20 border border-slate-700/80 flex items-center justify-center relative shadow-inner">
        <svg viewBox="0 0 100 100" className="w-14 h-14 sm:w-16 sm:h-16 text-amber-500/90" aria-hidden="true">
          {/* Road */}
          <path d="M 15 85 L 45 40 L 55 40 L 85 85 Z" fill="#1e293b" />
          <line x1="50" y1="45" x2="50" y2="80" stroke="#F5A524" strokeWidth="2.5" strokeDasharray="4 4" />
          {/* Horizon Sun */}
          <circle cx="50" cy="34" r="11" fill="#F5A524" opacity="0.9" />
          {/* Mountains */}
          <polygon points="10,65 35,45 60,65" fill="#334155" opacity="0.5" />
          <polygon points="45,65 70,42 95,65" fill="#334155" opacity="0.5" />
          {/* Truck Icon */}
          <g transform="translate(36, 58) scale(0.65)">
            <rect x="0" y="5" width="28" height="18" rx="2" fill="#14B8A6" />
            <rect x="25" y="10" width="14" height="13" rx="3" fill="#14B8A6" />
            <circle cx="10" cy="24" r="4" fill="#0f172a" stroke="#fff" strokeWidth="1.5" />
            <circle cx="32" cy="24" r="4" fill="#0f172a" stroke="#fff" strokeWidth="1.5" />
          </g>
        </svg>
      </div>

      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>FMCSA 49 CFR § 395 Standard</span>
        </div>
        <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Ready to Dispatch Your Route
        </h3>
        <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
          Input your current terminal location, freight pickup, and final dropoff destinations to simulate complete compliant hours of service, rest breaks, and printable daily paper log sheets.
        </p>
      </div>

      {/* Primary Action Button */}
      <div>
        <button
          type="button"
          onClick={onFillExample}
          className="inline-flex items-center gap-2.5 px-5 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-sm shadow-xl shadow-amber-500/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-slate-950"
        >
          <Sparkles className="w-4 h-4 text-slate-950 fill-slate-950" />
          <span>Try Example Trip (Chicago &rarr; Dallas &rarr; Atlanta)</span>
          <ArrowRight className="w-4 h-4 text-slate-950" />
        </button>
      </div>

      {/* Feature Highlights Grid */}
      <div className="pt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
        <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/80 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-semibold text-slate-200">Part 395 Rules</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">Enforces 11h driving, 14h window, 30m break &amp; 70h/8d cycle.</p>
          </div>
        </div>

        <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/80 flex items-start gap-2.5">
          <MapPin className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-semibold text-slate-200">Two-Color Route</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">Commercial truck corridor with fuel stops &amp; sleeper rests.</p>
          </div>
        </div>

        <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800/80 flex items-start gap-2.5">
          <FileText className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-semibold text-slate-200">Paper Log Sheets</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">Exact 24.00h balanced grids with PDF and PNG export.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
