import { Sparkles } from "lucide-react";

interface EmptyStateProps {
  onFillExample: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onFillExample }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center shadow-xl space-y-4 max-w-xl mx-auto my-8">
      {/* Truck & Route Illustration SVG */}
      <div className="w-24 h-24 mx-auto rounded-3xl bg-gradient-to-tr from-amber-500/10 to-teal-500/10 border border-slate-800 flex items-center justify-center relative shadow-inner">
        <svg viewBox="0 0 100 100" className="w-16 h-16 text-amber-500/80">
          {/* Road */}
          <path d="M 15 85 L 45 40 L 55 40 L 85 85 Z" fill="#1e293b" />
          <line x1="50" y1="45" x2="50" y2="80" stroke="#F5A524" strokeWidth="2" strokeDasharray="4 4" />
          {/* Horizon Sun / Moon */}
          <circle cx="50" cy="35" r="12" fill="#F5A524" opacity="0.8" />
          {/* Mountains */}
          <polygon points="10,65 35,45 60,65" fill="#334155" opacity="0.6" />
          <polygon points="45,65 70,42 95,65" fill="#334155" opacity="0.6" />
          {/* Truck Icon */}
          <g transform="translate(36, 60) scale(0.6)">
            <rect x="0" y="5" width="28" height="18" rx="2" fill="#14B8A6" />
            <rect x="25" y="10" width="14" height="13" rx="3" fill="#14B8A6" />
            <circle cx="10" cy="24" r="4" fill="#0f172a" stroke="#fff" strokeWidth="1" />
            <circle cx="32" cy="24" r="4" fill="#0f172a" stroke="#fff" strokeWidth="1" />
          </g>
        </svg>
      </div>

      <div>
        <h3 className="text-base font-bold text-white">No Route Dispatched Yet</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
          Enter your current location, pickup, and dropoff destinations above, or test our full FMCSA § 395 simulation engine instantly.
        </p>
      </div>

      <div>
        <button
          type="button"
          onClick={onFillExample}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-amber-500/20 transition"
        >
          <Sparkles className="w-4 h-4" />
          <span>Load Example Trip (Chicago &rarr; Dallas &rarr; Atlanta)</span>
        </button>
      </div>
    </div>
  );
};
