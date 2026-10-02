import React, { useState, useEffect } from "react";
import { Loader2, Navigation, Clock, FileText, CheckCircle2 } from "lucide-react";

export const LoadingState: React.FC = () => {
  const stages = [
    { title: "Geocoding Locations", desc: "Finding coordinates for Start, Pickup, and Dropoff...", icon: Navigation },
    { title: "Routing Commercial Highway", desc: "Generating distance and truck corridor geometry...", icon: Navigation },
    { title: "Calculating HOS Rest Breaks", desc: "Enforcing 11h driving, 14h window, fuel stops & sleeper rests...", icon: Clock },
    { title: "Generating Daily Log Sheets", desc: "Building balanced 24.00h paper log grids and duty steps...", icon: FileText },
  ];

  const [activeStage, setActiveStage] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStage((prev) => (prev < stages.length - 1 ? prev + 1 : prev));
    }, 1200);

    return () => clearInterval(timer);
  }, [stages.length]);

  return (
    <div className="space-y-4" role="status" aria-live="polite">
      {/* Simulation Stepper Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-card space-y-4 transition-colors">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              Planning Trip &amp; Generating Logs...
            </h3>
          </div>
          <span className="text-xs font-mono font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-200 dark:border-blue-500/20">
            Step {activeStage + 1} of 4
          </span>
        </div>

        <div className="space-y-2">
          {stages.map((stage, idx) => {
            const isDone = idx < activeStage;
            const isCurrent = idx === activeStage;
            const Icon = stage.icon;

            return (
              <div
                key={idx}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-all duration-300 ${
                  isCurrent
                    ? "bg-blue-50/70 dark:bg-blue-500/10 border-blue-300 dark:border-blue-500/30 text-blue-900 dark:text-blue-200"
                    : isDone
                    ? "bg-emerald-50/40 dark:bg-emerald-500/5 border-emerald-200 dark:border-emerald-500/20 text-slate-700 dark:text-slate-300"
                    : "bg-slate-50 dark:bg-slate-950/40 border-slate-200/70 dark:border-slate-800 text-slate-400 opacity-60"
                }`}
              >
                <div className="mt-0.5">
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />
                  ) : (
                    <Icon className="w-4 h-4 text-slate-400" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-200">{stage.title}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{stage.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Skeletons for Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2">
            <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-16"></div>
            <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-24"></div>
            <div className="h-2.5 bg-slate-100 dark:bg-slate-800/60 rounded w-20"></div>
          </div>
        ))}
      </div>

      {/* Skeleton for Map Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl h-[340px] sm:h-[420px] flex items-center justify-center animate-pulse">
        <div className="text-center space-y-2 text-slate-400">
          <Navigation className="w-8 h-8 mx-auto opacity-40 text-blue-500" />
          <p className="text-xs font-mono">Rendering Route Polyline...</p>
        </div>
      </div>
    </div>
  );
};
