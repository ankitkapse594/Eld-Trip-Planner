import React, { useState } from "react";
import { Code, Copy, Check, ChevronDown, ChevronUp, Terminal, Bug } from "lucide-react";
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
    <div className="no-print mt-6 border border-slate-800 bg-slate-900/90 rounded-2xl overflow-hidden shadow-2xl transition-all">
      {/* Dev Toggle Header */}
      <div className="p-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Bug className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-200">Raw JSON Debugger</span>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                Dev Tool
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Inspect raw wire payloads and response structures</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isOpen && (
            <>
              {/* Tab Selector */}
              <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab("response")}
                  className={`px-2.5 py-1 rounded-md transition font-medium ${
                    activeTab === "response"
                      ? "bg-amber-500/20 text-amber-300 font-semibold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Response ({response ? "200 OK" : "Empty"})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("request")}
                  className={`px-2.5 py-1 rounded-md transition font-medium ${
                    activeTab === "request"
                      ? "bg-amber-500/20 text-amber-300 font-semibold"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Request Payload
                </button>
              </div>

              {/* Copy Button */}
              <button
                type="button"
                onClick={handleCopy}
                disabled={!currentJson}
                className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono transition border border-slate-700"
                title="Copy raw JSON to clipboard"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </>
          )}

          {/* Toggle Accordion */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold transition border border-slate-700/60"
            aria-expanded={isOpen}
          >
            <Code className="w-3.5 h-3.5 text-amber-400" />
            <span>{isOpen ? "Hide Panel" : "Inspect Raw JSON"}</span>
            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded JSON Viewer */}
      {isOpen && (
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span className="flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-slate-500" />
              Showing {activeTab === "response" ? "TripPlanResponse payload" : "TripPlanRequest payload"}
            </span>
            <span>{new Blob([jsonString]).size} bytes</span>
          </div>

          <pre className="p-4 bg-slate-950 border border-slate-800/90 rounded-xl text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-[460px] overflow-y-auto leading-relaxed selection:bg-amber-500/30">
            <code>{jsonString}</code>
          </pre>
        </div>
      )}
    </div>
  );
};
