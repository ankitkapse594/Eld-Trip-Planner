import React, { useState, useEffect } from "react";
import { Loader2, Navigation, Clock, FileText, CheckCircle2 } from "lucide-react";

export const LoadingState: React.FC = () => {
  const stages = [
    { title: "Geocoding Waypoints", desc: "Resolving Origin, Pickup, and Dropoff coordinates...", icon: Navigation },
    { title: "Routing Commercial Corridor", desc: "Generating highway-compliant HGV polyline & distance...", icon: Navigation },
    { title: "Planning FMCSR § 395 Schedule", desc: "Enforcing 11h driving, 14h window, 30m break, fuel, and rests...", icon: Clock },
    { title: "Drawing Daily Log Sheets", desc: "Calculating 24.00h largest-remainder totals and paper grids...", icon: FileText },
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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
            <h3 className="text-sm font-bold text-white">Dispatching Trip Simulation...</h3>
          </div>
          <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            Step {activeStage + 1} of 4
          </span>
        </div>

        <div className="space-y-2.5">
          {stages.map((stage, idx) => {
            const isDone = idx < activeStage;
            const isCurrent = idx === activeStage;
            const Icon = stage.icon;

            return (
              <div
                key={idx}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-all duration-300 ${
                  isCurrent
                    ? "bg-amber-500/10 border-amber-500/40 text-amber-200 shadow-sm"
                    : isDone
                    ? "bg-teal-500/5 border-teal-500/20 text-slate-300"
                    : "bg-slate-950/40 border-slate-800/80 text-slate-600 opacity-60"
                }`}
              >
                <div className="mt-0.5">
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-teal-400" />
                  ) : isCurrent ? (
                    <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                  ) : (
                    <Icon className="w-4 h-4 text-slate-600" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-200">{stage.title}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{stage.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Skeletons for Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-2">
            <div className="h-3 bg-slate-800 rounded w-16"></div>
            <div className="h-6 bg-slate-800/80 rounded w-24"></div>
            <div className="h-2.5 bg-slate-800/40 rounded w-20"></div>
          </div>
        ))}
      </div>

      {/* Skeleton for Map Container */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl h-[340px] sm:h-[420px] flex items-center justify-center animate-pulse">
        <div className="text-center space-y-2 text-slate-600">
          <Navigation className="w-8 h-8 mx-auto animate-bounce opacity-40 text-amber-500" />
          <p className="text-xs font-mono">Rendering Commercial Route Polyline...</p>
        </div>
      </div>
    </div>
  );
};
