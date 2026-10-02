import React from "react";
import { Calendar, Sparkles } from "lucide-react";

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
  label = "Departure Time",
  value,
  onChange,
  error,
  disabled = false,
}) => {
  const formatLocalISO = (d: Date): string => {
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  const setNow = () => {
    const now = new Date();
    const min = Math.ceil(now.getMinutes() / 15) * 15;
    now.setMinutes(min, 0, 0);
    onChange(formatLocalISO(now));
  };

  const addHours = (hoursToAdd: number) => {
    const base = value ? new Date(value) : new Date();
    base.setHours(base.getHours() + hoursToAdd);
    const min = Math.ceil(base.getMinutes() / 15) * 15;
    base.setMinutes(min, 0, 0);
    onChange(formatLocalISO(base));
  };

  const setTomorrowMorning = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);
    onChange(formatLocalISO(tomorrow));
  };

  return (
    <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-blue-500" />
          <span>{label}</span>
        </label>
        <span className="text-[10px] text-slate-500 dark:text-slate-400">
          Terminal Time
        </span>
      </div>

      <input
        id={id}
        type="datetime-local"
        step="900" // 15-minute steps
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full bg-white dark:bg-slate-900 border rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 font-mono transition focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
          error ? "border-red-400 dark:border-red-500" : "border-slate-200 dark:border-slate-700 focus:border-blue-500"
        }`}
      />

      {error && <p className="text-[11px] text-red-500 dark:text-red-400 font-medium">{error}</p>}

      {/* Quick Departure Presets */}
      <div className="pt-0.5 flex items-center gap-1.5 flex-wrap text-[11px]">
        <span className="text-[10px] text-slate-400">Quick:</span>
        <button
          type="button"
          onClick={setNow}
          disabled={disabled}
          className="px-2 py-0.5 text-[10px] font-medium bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded transition"
        >
          Now
        </button>
        <button
          type="button"
          onClick={() => addHours(1)}
          disabled={disabled}
          className="px-2 py-0.5 text-[10px] font-medium bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded transition"
        >
          +1 Hour
        </button>
        <button
          type="button"
          onClick={setTomorrowMorning}
          disabled={disabled}
          className="px-2 py-0.5 text-[10px] font-medium bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded transition flex items-center gap-1"
        >
          <Sparkles className="w-2.5 h-2.5 text-blue-500" />
          Tomorrow 8 AM
        </button>
      </div>
    </div>
  );
};
