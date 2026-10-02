import React, { useState } from "react";
import { BookOpen, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";

interface AssumptionsPanelProps {
  assumptions: string[];
}

export const AssumptionsPanel: React.FC<AssumptionsPanelProps> = ({ assumptions }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-card transition-colors">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls="assumptions-content"
        className="w-full flex items-center justify-between text-left text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition rounded-lg p-0.5 focus-ring"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="font-semibold text-slate-900 dark:text-white">
            FMCSA Part 395 Regulatory Rules Applied
          </span>
          <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hidden sm:inline">
            Property 70h/8d
          </span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {isOpen && (
        <div
          id="assumptions-content"
          className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400"
        >
          {assumptions.map((rule, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 bg-slate-50 dark:bg-slate-950/40 p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-800"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <span>{rule}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
