import React from "react";
import type { Segment } from "../../types/trip";
import { ShieldCheck } from "lucide-react";

interface HosGaugesProps {
  segments: Segment[];
  initialCycle: number;
}

export const HosGauges: React.FC<HosGaugesProps> = ({ segments, initialCycle }) => {
  let maxShiftDriveMin = 0;
  let maxShiftWindowMin = 0;
  let curShiftDriveMin = 0;
  let curWindowStart: Date | null = null;
  let totalOnDutyMin = Math.round(initialCycle * 60);

  for (const seg of segments) {
    const start = new Date(seg.start);
    const end = new Date(seg.end);
    const durMin = Math.round((end.getTime() - start.getTime()) / 60000);

    // 10h rest or 34h restart resets shift
    if ((seg.status === "OFF" || seg.status === "SB") && durMin >= 600) {
      curShiftDriveMin = 0;
      curWindowStart = null;
      if (durMin >= 2040) {
        totalOnDutyMin = 0; // 34h restart
      }
      continue;
    }

    if (seg.status === "DRIVING" || seg.status === "ON_DUTY") {
      if (!curWindowStart) curWindowStart = start;
      totalOnDutyMin += durMin;
    }

    if (seg.status === "DRIVING") {
      curShiftDriveMin += durMin;
      if (curShiftDriveMin > maxShiftDriveMin) maxShiftDriveMin = curShiftDriveMin;
      if (curWindowStart) {
        const winElapsed = Math.round((end.getTime() - curWindowStart.getTime()) / 60000);
        if (winElapsed > maxShiftWindowMin) maxShiftWindowMin = winElapsed;
      }
    }
  }

  const maxDriveHrs = maxShiftDriveMin / 60;
  const maxWinHrs = maxShiftWindowMin / 60;
  const cycleHrs = totalOnDutyMin / 60;

  const drivePct = Math.min(100, Math.round((maxDriveHrs / 11.0) * 100));
  const winPct = Math.min(100, Math.round((maxWinHrs / 14.0) * 100));
  const cyclePct = Math.min(100, Math.round((cycleHrs / 70.0) * 100));

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-card transition-colors space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Driver Safety Clocks</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Peak shift utilization under Part 395 regulations
          </p>
        </div>
      </div>

      <div className="space-y-3.5">
        {/* 11h Drive Limit */}
        <div className="space-y-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs font-medium">
            <span className="text-slate-700 dark:text-slate-300">
              Shift Driving Limit (11 hrs max)
            </span>
            <span className="font-mono text-slate-900 dark:text-slate-100">
              {maxDriveHrs.toFixed(1)} / 11.0h{" "}
              <span className="text-slate-500 font-sans text-[11px]">({drivePct}%)</span>
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                drivePct >= 100 ? "bg-amber-500" : "bg-blue-600 dark:bg-blue-500"
              }`}
              style={{ width: `${drivePct}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400">
            Resets after 10 consecutive hours in sleeper berth
          </p>
        </div>

        {/* 14h Duty Window */}
        <div className="space-y-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs font-medium">
            <span className="text-slate-700 dark:text-slate-300">
              Daily Duty Window (14 hrs max)
            </span>
            <span className="font-mono text-slate-900 dark:text-slate-100">
              {maxWinHrs.toFixed(1)} / 14.0h{" "}
              <span className="text-slate-500 font-sans text-[11px]">({winPct}%)</span>
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-600 dark:bg-emerald-500 transition-all duration-500"
              style={{ width: `${winPct}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400">
            Consecutive daily work window from start of duty
          </p>
        </div>

        {/* 70h/8d Cycle */}
        <div className="space-y-1">
          <div className="flex flex-wrap items-baseline justify-between gap-2 text-xs font-medium">
            <span className="text-slate-700 dark:text-slate-300">
              Weekly Cycle (70 hrs / 8 days)
            </span>
            <span className="font-mono text-slate-900 dark:text-slate-100">
              {cycleHrs.toFixed(1)} / 70.0h{" "}
              <span className="text-slate-500 font-sans text-[11px]">({cyclePct}%)</span>
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-600 dark:bg-indigo-500 transition-all duration-500"
              style={{ width: `${cyclePct}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400">
            Cumulative on-duty hours; resets with 34h restart
          </p>
        </div>
      </div>
    </div>
  );
};
