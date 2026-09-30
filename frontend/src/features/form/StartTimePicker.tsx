import React from "react";
import { Calendar, Clock, Sparkles } from "lucide-react";

interface StartTimePickerProps {
  id?: string;
  label?: string;
  value: string; // ISO string without seconds: "YYYY-MM-DDTHH:mm"
  onChange: (val: string) => void;
  error?: string;
  disabled?: boolean;
}

export const StartTimePicker: React.FC<StartTimePickerProps> = ({
  id = "start-datetime",
  label = "Home Terminal Departure",
  value,
  onChange,
  error,
  disabled = false,
}) => {
  // Helper to format Date to local YYYY-MM-DDTHH:mm
  const formatLocalISO = (d: Date): string => {
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  // Preset: Now rounded up to next 15-minute interval
  const setNow = () => {
    const now = new Date();
    const min = Math.ceil(now.getMinutes() / 15) * 15;
    now.setMinutes(min, 0, 0);
    onChange(formatLocalISO(now));
  };

  // Preset: +1 Hour from current value
  const addHours = (hoursToAdd: number) => {
    const base = value ? new Date(value) : new Date();
    base.setHours(base.getHours() + hoursToAdd);
    const min = Math.ceil(base.getMinutes() / 15) * 15;
    base.setMinutes(min, 0, 0);
    onChange(formatLocalISO(base));
  };

  // Preset: Tomorrow at 08:00 AM
  const setTomorrowMorning = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);
    onChange(formatLocalISO(tomorrow));
  };

  return (
    <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-teal-400" />
          <span>{label}</span>
        </label>
        <span className="text-[10px] font-mono text-teal-400/80 bg-teal-500/10 px-1.5 py-0.5 rounded border border-teal-500/20">
          Home Terminal Time (§ 395.8)
        </span>
      </div>

      <div className="relative">
        <input
          id={id}
          type="datetime-local"
          step="900" // 15-minute steps
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`w-full bg-slate-900 border rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-teal-500/40 transition ${
            error ? "border-red-500/70" : "border-slate-800 focus:border-teal-500"
          }`}
        />
      </div>

      {error && <p className="text-[11px] text-red-400 font-medium">{error}</p>}

      {/* Quick Departure Presets */}
      <div className="pt-1 flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] text-slate-500 flex items-center gap-1 mr-1">
          <Clock className="w-3 h-3 text-slate-500" />
          Presets:
        </span>
        <button
          type="button"
          onClick={setNow}
          disabled={disabled}
          className="px-2 py-0.5 text-[10px] font-medium bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 rounded transition"
        >
          Now
        </button>
        <button
          type="button"
          onClick={() => addHours(1)}
          disabled={disabled}
          className="px-2 py-0.5 text-[10px] font-medium bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 rounded transition"
        >
          +1 Hour
        </button>
        <button
          type="button"
          onClick={setTomorrowMorning}
          disabled={disabled}
          className="px-2 py-0.5 text-[10px] font-medium bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 rounded transition flex items-center gap-1"
        >
          <Sparkles className="w-2.5 h-2.5 text-teal-400" />
          Tomorrow 08:00
        </button>
      </div>
    </div>
  );
};
