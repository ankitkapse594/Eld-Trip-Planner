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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
        No daily logs generated yet. Plan a trip above to generate logs.
      </div>
    );
  }

  const currentLog = logs[activeDayIndex] || logs[0];

  // Bulk PDF export of all daily log sheets
  const handleDownloadAll = async () => {
    setIsExportingAll(true);
    try {
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "in",
        format: "letter",
      });

      // Find the log sheet element currently rendered
      const container = document.querySelector(".log-sheet-container") as HTMLElement;
      if (!container) return;

      for (let i = 0; i < logs.length; i++) {
        // Temporarily set active tab to render sheet i
        setActiveDayIndex(i);
        // Small delay for DOM paint
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
      {/* Day Selector Navigation Tabs */}
      <div className="no-print flex items-center justify-between bg-slate-900 border border-slate-800 rounded-2xl p-2 shadow-lg">
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-[70%]">
          {logs.map((log, idx) => {
            const isActive = idx === activeDayIndex;
            return (
              <button
                key={log.date}
                type="button"
                onClick={() => setActiveDayIndex(idx)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 border ${
                  isActive
                    ? "bg-amber-500 text-slate-950 border-amber-400 shadow-md font-bold"
                    : "bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white"
                }`}
              >
                <span>Day {idx + 1}</span>
                <span className="font-mono text-[10px] opacity-80">({log.date.slice(5)})</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveDayIndex(Math.max(0, activeDayIndex - 1))}
            disabled={activeDayIndex === 0}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
            title="Previous Day"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono font-medium text-slate-400 px-1">
            {activeDayIndex + 1} / {logs.length}
          </span>
          <button
            type="button"
            onClick={() => setActiveDayIndex(Math.min(logs.length - 1, activeDayIndex + 1))}
            disabled={activeDayIndex === logs.length - 1}
            className="p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
            title="Next Day"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isExportingAll && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-300 flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
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
