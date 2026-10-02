import React, { useState } from "react";
import { Code, Copy, Check, ChevronDown, ChevronUp, Terminal } from "lucide-react";
import type { TripPlanRequest, TripPlanResponse } from "../types/trip";

interface DebugJsonPanelProps {
  request: TripPlanRequest | null;
  response: TripPlanResponse | null;
}

export const DebugJsonPanel: React.FC<DebugJsonPanelProps> = ({ request, response }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<"response" | "request">("response");
  const [copied, setCopied] = useState<boolean>(false);

  const currentJson = activeTab === "response" ? response : request;
  const jsonString = currentJson ? JSON.stringify(currentJson, null, 2) : "// No data available yet";

  const handleCopy = () => {
    if (!currentJson) return;
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="no-print pt-4 border-t border-slate-200/80 dark:border-slate-800 text-center">
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition py-1 px-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60"
        >
          <Code className="w-3.5 h-3.5" />
          <span>Developer API Inspector</span>
          <ChevronDown className="w-3.5 h-3.5 opacity-60" />
        </button>
      ) : (
        <div className="text-left border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-card transition-colors">
          <div className="p-3 bg-slate-50 dark:bg-slate-950/80 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                API JSON Payload Inspector
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Tab Selector */}
              <div className="flex items-center bg-slate-200/70 dark:bg-slate-800 p-0.5 rounded-lg text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab("response")}
                  className={`px-2.5 py-1 rounded-md transition font-medium ${
                    activeTab === "response"
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  Response ({response ? "200 OK" : "Empty"})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("request")}
                  className={`px-2.5 py-1 rounded-md transition font-medium ${
                    activeTab === "request"
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-600 dark:text-slate-400"
                  }`}
                >
                  Request
                </button>
              </div>

              {/* Copy Button */}
              <button
                type="button"
                onClick={handleCopy}
                disabled={!currentJson}
                className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-mono transition border border-slate-200 dark:border-slate-700"
                title="Copy raw JSON"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition"
                title="Close Inspector"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-3">
            <pre className="p-3 bg-slate-950 text-emerald-400 rounded-xl text-xs font-mono overflow-x-auto max-h-[380px] overflow-y-auto leading-relaxed">
              <code>{jsonString}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
