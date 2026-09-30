import React, { useState } from "react";
import { BookOpen, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";

interface AssumptionsPanelProps {
  assumptions: string[];
}

export const AssumptionsPanel: React.FC<AssumptionsPanelProps> = ({ assumptions }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 shadow-lg">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls="assumptions-content"
        className="w-full flex items-center justify-between text-left text-xs font-semibold text-slate-300 hover:text-white transition rounded-lg p-1 -m-1 focus-ring"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-amber-500" />
          <span>FMCSA 49 CFR Part 395 Regulatory Assumptions</span>
          <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-amber-400 border border-slate-700">
            Property-Carrying 70h/8d
          </span>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
      </button>

      {isOpen && (
        <div id="assumptions-content" className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-400">
          {assumptions.map((rule, idx) => (
            <div key={idx} className="flex items-start gap-2 bg-slate-950/40 p-2 rounded-xl border border-slate-800/60">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
              <span>{rule}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
