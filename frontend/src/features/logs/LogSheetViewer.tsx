import React, { useState } from "react";
import type { DailyLog } from "../../types/trip";
import { LogSheet } from "./LogSheet";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface LogSheetViewerProps {
  logs: DailyLog[];
}

export const LogSheetViewer: React.FC<LogSheetViewerProps> = ({ logs }) => {
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [isExportingAll, setIsExportingAll] = useState(false);

  if (!logs || logs.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center text-slate-500 shadow-card">
        No daily logs generated yet. Plan a trip above to generate logs.
      </div>
    );
  }

  const currentLog = logs[activeDayIndex] || logs[0];

  const handleDownloadAll = async () => {
    setIsExportingAll(true);
    try {
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "in",
        format: "letter",
      });

      const container = document.querySelector(".log-sheet-container") as HTMLElement;
      if (!container) return;

      for (let i = 0; i < logs.length; i++) {
        setActiveDayIndex(i);
        await new Promise((r) => setTimeout(r, 250));

        const canvas = await html2canvas(container, {
          scale: 2,
          backgroundColor: "#ffffff",
        });
        const imgData = canvas.toDataURL("image/jpeg", 0.95);

        if (i > 0) pdf.addPage("letter", "landscape");
        pdf.addImage(imgData, "JPEG", 0.4, 0.4, 10.2, 7.7);
      }

      pdf.save(`ELD_Trip_All_Daily_Logs_${logs[0].date}.pdf`);
    } catch (err) {
      console.error("Bulk export failed:", err);
    } finally {
      setIsExportingAll(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Day Selector Navigation Bar */}
      <div className="no-print flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-2.5 shadow-card transition-colors">
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-[75%]" role="tablist" aria-label="Daily log sheets">
          {logs.map((log, idx) => {
            const isActive = idx === activeDayIndex;
            return (
              <button
                key={log.date}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`View Daily Log Day ${idx + 1}`}
                onClick={() => setActiveDayIndex(idx)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition flex items-center gap-1.5 focus-ring ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm font-semibold"
                    : "bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                }`}
              >
                <span>Day {idx + 1}</span>
                <span className={`font-mono text-[11px] ${isActive ? "text-blue-100" : "text-slate-400"}`}>
                  ({log.date.slice(5)})
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setActiveDayIndex(Math.max(0, activeDayIndex - 1))}
            disabled={activeDayIndex === 0}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
            title="Previous Day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400 px-1">
            {activeDayIndex + 1} / {logs.length}
          </span>
          <button
            type="button"
            onClick={() => setActiveDayIndex(Math.min(logs.length - 1, activeDayIndex + 1))}
            disabled={activeDayIndex === logs.length - 1}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
            title="Next Day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isExportingAll && (
        <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl p-3 text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-spin" />
          <span>Generating multi-page PDF for all {logs.length} daily logs... please wait.</span>
        </div>
      )}

      {/* Render Current Active Log Sheet */}
      <LogSheet
        log={currentLog}
        dayIndex={activeDayIndex}
        totalDays={logs.length}
        onDownloadAll={logs.length > 1 ? handleDownloadAll : undefined}
        allLogs={logs}
      />
    </div>
  );
};
