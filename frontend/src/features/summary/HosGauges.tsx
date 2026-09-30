import React from "react";
import type { Segment } from "../../types/trip";

interface HosGaugesProps {
  segments: Segment[];
  initialCycle: number;
}

export const HosGauges: React.FC<HosGaugesProps> = ({ segments, initialCycle }) => {
  // Compute max shift drive and shift window across all shifts
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
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
        <span>FMCSR HOS Duty Gauges</span>
        <span className="text-[11px] font-mono text-teal-400">Peak Shift Utilization</span>
      </div>

      <div className="space-y-2.5">
        {/* 11h Drive Limit */}
        <div>
          <div className="flex justify-between text-xs mb-1 font-mono">
            <span className="text-slate-400">11-Hour Drive Limit (§ 395.3(a)(3)(i))</span>
            <span className="font-semibold text-amber-400">
              {maxDriveHrs.toFixed(1)} / 11.0h ({drivePct}%)
            </span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                drivePct > 95 ? "bg-amber-500" : "bg-gradient-to-r from-amber-500 to-amber-400"
              }`}
              style={{ width: `${drivePct}%` }}
            />
          </div>
        </div>

        {/* 14h Duty Window */}
        <div>
          <div className="flex justify-between text-xs mb-1 font-mono">
            <span className="text-slate-400">14-Hour Driving Window (§ 395.3(a)(2))</span>
            <span className="font-semibold text-teal-400">
              {maxWinHrs.toFixed(1)} / 14.0h ({winPct}%)
            </span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-400 transition-all duration-500"
              style={{ width: `${winPct}%` }}
            />
          </div>
        </div>

        {/* 70h/8d Cycle */}
        <div>
          <div className="flex justify-between text-xs mb-1 font-mono">
            <span className="text-slate-400">70-Hour / 8-Day Cycle (§ 395.3(b)(2))</span>
            <span className="font-semibold text-indigo-400">
              {cycleHrs.toFixed(1)} / 70.0h ({cyclePct}%)
            </span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all duration-500"
              style={{ width: `${cyclePct}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
