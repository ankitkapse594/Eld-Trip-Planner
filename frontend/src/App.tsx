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
import { DebugJsonPanel } from "./components/DebugJsonPanel";
import { useTripPlanMutation } from "./hooks/useTripPlan";
import { useTheme } from "./hooks/useTheme";
import type { TripPlanRequest } from "./types/trip";
import { Calendar, FileText, ArrowRight } from "lucide-react";

export const App: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [lastRequest, setLastRequest] = useState<TripPlanRequest | null>(null);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"timeline" | "logs">("timeline");
  const [initialCycleUsed, setInitialCycleUsed] = useState<number>(32.5);

  const {
    mutate: planTripMutate,
    isPending: isLoading,
    error: apiError,
    data: planResult,
    reset: resetMutation,
  } = useTripPlanMutation();

  const handlePlanTrip = (req: TripPlanRequest) => {
    setLastRequest(req);
    setInitialCycleUsed(req.cycle_used_hours);

    planTripMutate(req, {
      onSuccess: (response) => {
        if (response.stops.length > 0) {
          setSelectedStopId(response.stops[0].id);
        }
      },
    });
  };

  const handleFillExample = () => {
    const btn = document.querySelector('button[title*="Chicago"]') as HTMLButtonElement;
    if (btn) btn.click();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Skip to Main Content Link for Accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 z-50 bg-blue-600 text-white font-medium px-4 py-2 rounded-xl shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
      >
        Skip to main content
      </a>

      {/* Top Header */}
      <Header
        hosValid={planResult?.summary.hos_valid}
        totalMiles={planResult?.summary.total_miles}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main id="main-content" className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Error notification if any */}
        {apiError && (
          <ErrorBanner
            message={apiError.message || "An error occurred while generating your trip plan."}
            details={apiError.details}
            onDismiss={() => resetMutation()}
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

        {/* Bottom Full-Width Tabbed Section: [Itinerary Timeline] [Daily Log Sheets] */}
        {planResult && (
          <div className="mt-8 space-y-4">
            <div
              className="no-print border-b border-slate-200 dark:border-slate-800 flex items-center gap-6 overflow-x-auto"
              role="tablist"
              aria-label="Trip views"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "timeline"}
                aria-controls="panel-timeline"
                onClick={() => setActiveTab("timeline")}
                className={`pb-3 text-sm font-medium flex items-center gap-2 border-b-2 transition focus-ring -mb-[1px] ${
                  activeTab === "timeline"
                    ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-semibold"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Trip Schedule &amp; Stops</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                  {planResult.stops.length}
                </span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "logs"}
                aria-controls="panel-logs"
                onClick={() => setActiveTab("logs")}
                className={`pb-3 text-sm font-medium flex items-center gap-2 border-b-2 transition focus-ring -mb-[1px] ${
                  activeTab === "logs"
                    ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-semibold"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Driver Daily Log Sheets</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 font-mono font-medium">
                  {planResult.daily_logs.length} Days
                </span>
              </button>
            </div>

            {/* Tab 1: Timeline & Breakdown */}
            {activeTab === "timeline" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
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
                  {/* Trip Legs Breakdown */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-card transition-colors space-y-3">
                    <h3 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
                      Trip Legs Summary
                    </h3>
                    <div className="space-y-2 text-xs">
                      {planResult.route.legs.map((leg, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/70 dark:border-slate-800/80 space-y-1"
                        >
                          <div className="flex justify-between items-center text-slate-800 dark:text-slate-200">
                            <span className="font-medium truncate max-w-[140px]">
                              {leg.from}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="font-medium truncate max-w-[140px]">
                              {leg.to}
                            </span>
                          </div>
                          <div className="flex justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-200/60 dark:border-slate-900">
                            <span>{leg.miles.toFixed(1)} miles</span>
                            <span className="text-blue-600 dark:text-blue-400 font-medium">
                              ~{leg.hours.toFixed(1)} driving hrs
                            </span>
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

        {/* Global Assumptions Panel if no trip planned yet */}
        {!planResult && (
          <AssumptionsPanel
            assumptions={[
              "Standard property-carrying CMV operating on a 70-hour / 8-day schedule (§ 395.3(b)(2)).",
              "Maximum 11.0 hours driving within a 14-consecutive-hour daily duty window (§ 395.3(a)).",
              "Mandatory 30-minute consecutive rest break within 8 cumulative driving hours (§ 395.3(a)(3)(ii)).",
              "10 consecutive hours in the Sleeper Berth resets the driving and duty window clocks (§ 395.1(g)(1)).",
              "Refueling scheduled at least once every <= 1,000 miles (30 min On Duty).",
              "Terminal freight operations: 1.0 hr On Duty at Pickup, 1.0 hr On Duty at Dropoff.",
              "Constant average highway speed of 55.0 mph applied across calculated route.",
              "All times recorded in driver's home terminal time standard (§ 395.8(a)(1)).",
            ]}
          />
        )}

        {/* Developer API JSON Inspector (Discreet footer toggle) */}
        <DebugJsonPanel request={lastRequest} response={planResult ?? null} />
      </main>

      {/* Footer */}
      <footer className="no-print mt-auto border-t border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 py-4 px-6 text-center text-xs text-slate-500 dark:text-slate-400 transition-colors">
        <p>
          ELD Trip Planner &bull; FMCSA Part 395 Hours of Service &amp; Daily Paper Log Sheet Dispatcher
        </p>
      </footer>
    </div>
  );
};

export default App;
