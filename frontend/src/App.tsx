import React, { useState } from "react";
import { Header } from "./components/Header";
import { TripForm } from "./features/form/TripForm";
import { SummaryCards } from "./features/summary/SummaryCards";
import { HosGauges } from "./features/summary/HosGauges";
import { RouteMap } from "./features/map/RouteMap";
import { StopsTimeline } from "./features/summary/StopsTimeline";
import { LogSheetViewer } from "./features/logs/LogSheetViewer";
import { AssumptionsPanel } from "./components/AssumptionsPanel";
import { ErrorBanner } from "./components/ErrorBanner";
import { LoadingState } from "./components/LoadingState";
import { EmptyState } from "./components/EmptyState";
import { planTrip } from "./api/client";
import type { TripPlanRequest, TripPlanResponse } from "./types/trip";
import { Map, FileText } from "lucide-react";

export const App: React.FC = () => {
  const [planResult, setPlanResult] = useState<TripPlanResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<Record<string, any> | undefined>(undefined);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"timeline" | "logs">("timeline");
  const [initialCycleUsed, setInitialCycleUsed] = useState<number>(32.5);

  const handlePlanTrip = async (req: TripPlanRequest) => {
    setIsLoading(true);
    setErrorMsg(null);
    setErrorDetails(undefined);
    setInitialCycleUsed(req.cycle_used_hours);

    try {
      const response = await planTrip(req);
      setPlanResult(response);
      if (response.stops.length > 0) {
        setSelectedStopId(response.stops[0].id);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred while planning your trip.");
      setErrorDetails(err.details);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillExample = () => {
    const btn = document.querySelector('button[title*="Chicago"]') as HTMLButtonElement;
    if (btn) btn.click();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <Header
        hosValid={planResult?.summary.hos_valid}
        totalMiles={planResult?.summary.total_miles}
      />

      <main className="flex-1 max-w-[1700px] w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Error notification if any */}
        {errorMsg && (
          <ErrorBanner
            message={errorMsg}
            details={errorDetails}
            onDismiss={() => setErrorMsg(null)}
          />
        )}

        {/* 2-Column Responsive Dispatch Console: Left Form & Stats / Right Map */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column (5 cols on large screen) */}
          <div className="lg:col-span-5 space-y-5">
            <TripForm onSubmit={handlePlanTrip} isLoading={isLoading} />

            {/* Gauges when plan is available */}
            {planResult && (
              <HosGauges
                segments={planResult.segments}
                initialCycle={initialCycleUsed}
              />
            )}
          </div>

          {/* Right Column: Map & Overview (7 cols on large screen) */}
          <div className="lg:col-span-7 space-y-5">
            {isLoading ? (
              <LoadingState />
            ) : planResult ? (
              <>
                <SummaryCards summary={planResult.summary} />
                <RouteMap
                  route={planResult.route}
                  stops={planResult.stops}
                  selectedStopId={selectedStopId}
                  onSelectStop={(id) => setSelectedStopId(id)}
                />
              </>
            ) : (
              <div className="space-y-4">
                <RouteMap
                  route={null}
                  stops={[]}
                  selectedStopId={null}
                  onSelectStop={() => {}}
                />
                <EmptyState onFillExample={handleFillExample} />
              </div>
            )}
          </div>
        </div>

        {/* Bottom Full-Width Tabbed Section: [Route & Stops Timeline] [Daily Log Sheets] */}
        {planResult && (
          <div className="mt-8 space-y-4">
            <div className="no-print border-b border-slate-800 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveTab("timeline")}
                className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition ${
                  activeTab === "timeline"
                    ? "border-amber-500 text-amber-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Map className="w-4 h-4" />
                <span>Route &amp; Stops Timeline</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                  {planResult.stops.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("logs")}
                className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition ${
                  activeTab === "logs"
                    ? "border-amber-500 text-amber-400"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Daily Log Sheets (Drivers Daily Log)</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-teal-400 font-mono">
                  {planResult.daily_logs.length} Sheets
                </span>
              </button>
            </div>

            {/* Tab 1: Timeline */}
            {activeTab === "timeline" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <StopsTimeline
                    stops={planResult.stops}
                    selectedStopId={selectedStopId}
                    onSelectStop={(id) => {
                      setSelectedStopId(id);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  />
                </div>

                <div className="space-y-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
                    <h3 className="text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
                      Trip Legs Breakdown
                    </h3>
                    <div className="space-y-2 text-xs">
                      {planResult.route.legs.map((leg, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1"
                        >
                          <div className="flex justify-between items-center text-slate-300">
                            <span className="font-semibold text-slate-100 truncate max-w-[180px]">
                              {leg.from}
                            </span>
                            <span className="text-slate-500">&rarr;</span>
                            <span className="font-semibold text-slate-100 truncate max-w-[180px]">
                              {leg.to}
                            </span>
                          </div>
                          <div className="flex justify-between text-[11px] font-mono text-slate-400 pt-1 border-t border-slate-900">
                            <span>{leg.miles.toFixed(1)} miles</span>
                            <span className="text-amber-400">~{leg.hours.toFixed(1)} driving hrs</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <AssumptionsPanel assumptions={planResult.assumptions} />
                </div>
              </div>
            )}

            {/* Tab 2: Daily Log Sheets */}
            {activeTab === "logs" && (
              <LogSheetViewer logs={planResult.daily_logs} />
            )}
          </div>
        )}

        {/* Global Assumptions Panel if no trip yet */}
        {!planResult && (
          <AssumptionsPanel
            assumptions={[
              "Property-carrying CMV, 70-hour / 8-day schedule (§ 395.3(b)(2)).",
              "Maximum 11.0 hours driving within a 14-consecutive-hour window (§ 395.3(a)).",
              "Mandatory 30-minute consecutive rest break after 8 cumulative driving hours (§ 395.3(a)(3)(ii)).",
              "Sleeper berth rest periods taken in 10 consecutive hours (§ 395.1(g)(1)).",
              "Mandatory fueling stop scheduled every <= 1,000 miles (30 min On Duty).",
              "Terminal service: 1 hr On Duty at Pickup, 1 hr On Duty at Dropoff.",
              "Average driving speed constant 55.0 mph applied across route distance.",
              "All times recorded in driver's home terminal time standard (§ 395.8(a)(1)).",
            ]}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="no-print mt-auto border-t border-slate-800 bg-slate-900/60 py-4 px-6 text-center text-xs text-slate-500">
        <p>
          ELD Trip Planner &bull; Built with Python Django 5 (DRF) + React 18 &amp; TypeScript &bull; FMCSA Part 395 Compliant
        </p>
      </footer>
    </div>
  );
};

export default App;
