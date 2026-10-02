import React from "react";
import { Truck, CheckCircle2, AlertTriangle, Moon, Sun, Route } from "lucide-react";
import type { Theme } from "../hooks/useTheme";

interface HeaderProps {
  hosValid?: boolean;
  totalMiles?: number;
  theme: Theme;
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  hosValid,
  totalMiles,
  theme,
  onToggleTheme,
}) => {
  return (
    <header className="no-print sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo & Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center shadow-sm">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white tracking-tight">
                ELD Trip Planner
              </h1>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                HOS § 395
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
              Route dispatch simulation &amp; driver log sheets
            </p>
          </div>
        </div>

        {/* Right Actions & Status Badges */}
        <div className="flex items-center gap-2.5">
          {totalMiles !== undefined && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/80 text-xs text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 font-mono">
              <Route className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>{totalMiles.toLocaleString()} miles</span>
            </div>
          )}

          {hosValid !== undefined && (
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${
                hosValid
                  ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                  : "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20"
              }`}
            >
              {hosValid ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
              )}
              <span>{hosValid ? "HOS Compliant" : "Violation"}</span>
            </div>
          )}

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={onToggleTheme}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 transition focus-ring"
            title={theme === "dark" ? "Switch to clean light mode" : "Switch to dark mode"}
            aria-label="Toggle visual theme"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
