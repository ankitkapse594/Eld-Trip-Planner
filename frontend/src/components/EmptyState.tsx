import React from "react";
import { Sparkles, ShieldCheck, Route, FileText, ArrowRight } from "lucide-react";

interface EmptyStateProps {
  onFillExample: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onFillExample }) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 sm:p-8 text-center shadow-card space-y-5 max-w-xl mx-auto my-4 transition-colors">
      {/* Clean Route Icon */}
      <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
        <Route className="w-7 h-7" />
      </div>

      <div className="space-y-1.5">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>FMCSA Part 395 Standard</span>
        </div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight">
          Ready to plan your trip
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
          Input your starting terminal, freight pickup, and final destination to calculate compliant drive times, required rest breaks, and printable daily driver log sheets.
        </p>
      </div>

      {/* Primary Action Button */}
      <div>
        <button
          type="button"
          onClick={onFillExample}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium rounded-xl text-xs sm:text-sm shadow-sm transition-all focus-ring"
        >
          <Sparkles className="w-4 h-4" />
          <span>Try Sample Route (Chicago &rarr; Dallas &rarr; Atlanta)</span>
          <ArrowRight className="w-4 h-4 ml-1" />
        </button>
      </div>

      {/* Feature Highlights Grid */}
      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-left">
        <div className="p-2.5 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200/70 dark:border-slate-800 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-medium text-slate-900 dark:text-slate-200">HOS Safety</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">11h drive, 14h window &amp; 30m breaks.</p>
          </div>
        </div>

        <div className="p-2.5 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200/70 dark:border-slate-800 flex items-start gap-2">
          <Route className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-medium text-slate-900 dark:text-slate-200">Interactive Map</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Fuel stops &amp; 10h sleeper rests.</p>
          </div>
        </div>

        <div className="p-2.5 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-200/70 dark:border-slate-800 flex items-start gap-2">
          <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-medium text-slate-900 dark:text-slate-200">Daily Logs</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Exact 24.00h paper grids &amp; PDF.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
