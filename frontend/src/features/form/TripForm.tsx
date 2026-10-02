import React, { useState } from "react";
import { Sparkles, ChevronDown, ChevronUp, Navigation, Sliders, ArrowRight } from "lucide-react";
import type { LocationPoint, TripPlanRequest } from "../../types/trip";
import { LocationInput } from "./LocationInput";
import { StartTimePicker } from "./StartTimePicker";

interface TripFormProps {
  onSubmit: (data: TripPlanRequest) => void;
  isLoading: boolean;
}

export const TripForm: React.FC<TripFormProps> = ({ onSubmit, isLoading }) => {
  const [currentLoc, setCurrentLoc] = useState<LocationPoint | null>(null);
  const [pickupLoc, setPickupLoc] = useState<LocationPoint | null>(null);
  const [dropoffLoc, setDropoffLoc] = useState<LocationPoint | null>(null);
  const [cycleUsed, setCycleUsed] = useState<number>(32.5);

  const getDefaultStartTime = () => {
    const d = new Date();
    const min = Math.ceil(d.getMinutes() / 15) * 15;
    d.setMinutes(min, 0, 0);
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  const [startTime, setStartTime] = useState<string>(getDefaultStartTime());

  // Optional carrier details
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [carrierName, setCarrierName] = useState<string>("Antigravity Freight Lines");
  const [mainOffice, setMainOffice] = useState<string>("100 S. Wacker Dr, Chicago, IL");
  const [homeTerminal, setHomeTerminal] = useState<string>("400 Logistics Blvd, Joliet, IL");
  const [vehicleNo, setVehicleNo] = useState<string>("TRK-9042 / TRL-4410");
  const [driverName, setDriverName] = useState<string>("Alex Vance");
  const [coDriver, setCoDriver] = useState<string>("");
  const [commodity, setCommodity] = useState<string>("Industrial Components");
  const [bolNo, setBolNo] = useState<string>("BOL-8829104");

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!currentLoc) errs.current = "Please enter current vehicle location.";
    if (!pickupLoc) errs.pickup = "Please enter freight pickup location.";
    if (!dropoffLoc) errs.dropoff = "Please enter delivery dropoff location.";
    if (cycleUsed < 0 || cycleUsed > 70) errs.cycle = "Cycle hours must be between 0 and 70.";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || !currentLoc || !pickupLoc || !dropoffLoc) return;

    onSubmit({
      current_location: currentLoc,
      pickup_location: pickupLoc,
      dropoff_location: dropoffLoc,
      cycle_used_hours: cycleUsed,
      start_datetime: startTime ? `${startTime}:00` : null,
      carrier_name: carrierName,
      main_office_address: mainOffice,
      home_terminal_address: homeTerminal,
      vehicle_numbers: vehicleNo,
      driver_name: driverName,
      co_driver: coDriver,
      shipper_commodity: commodity,
      shipping_doc_no: bolNo,
    });
  };

  const handleFillExample = () => {
    const cur: LocationPoint = {
      label: "Chicago, IL, USA",
      lat: 41.8781,
      lng: -87.6298,
    };
    const pick: LocationPoint = {
      label: "Dallas, TX, USA",
      lat: 32.7767,
      lng: -96.797,
    };
    const drop: LocationPoint = {
      label: "Atlanta, GA, USA",
      lat: 33.749,
      lng: -84.388,
    };

    setCurrentLoc(cur);
    setPickupLoc(pick);
    setDropoffLoc(drop);
    setCycleUsed(40.0);
    setErrors({});

    onSubmit({
      current_location: cur,
      pickup_location: pick,
      dropoff_location: drop,
      cycle_used_hours: 40.0,
      start_datetime: startTime ? `${startTime}:00` : null,
      carrier_name: carrierName,
      main_office_address: mainOffice,
      home_terminal_address: homeTerminal,
      vehicle_numbers: vehicleNo,
      driver_name: driverName,
      co_driver: coDriver,
      shipper_commodity: commodity,
      shipping_doc_no: bolNo,
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-card transition-colors space-y-5"
    >
      {/* Card Header & Example Route Pill */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Navigation className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Trip Route &amp; Driver</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Specify origin, pickup, and delivery destinations
          </p>
        </div>

        <button
          type="button"
          onClick={handleFillExample}
          disabled={isLoading}
          className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 rounded-xl text-xs font-medium transition"
          title="Load Chicago -> Dallas -> Atlanta example"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>Try example</span>
        </button>
      </div>

      {/* Visual Waypoint Inputs with Clean Connecting Line */}
      <div className="relative space-y-3.5 pl-1">
        <LocationInput
          id="loc-current"
          label="Current Location"
          placeholder="Where are you starting? (e.g. Chicago, IL)"
          value={currentLoc}
          onChange={setCurrentLoc}
          error={errors.current}
          pinColor="text-blue-500"
        />

        <LocationInput
          id="loc-pickup"
          label="Freight Pickup"
          placeholder="Where is the cargo loaded? (e.g. Dallas, TX)"
          value={pickupLoc}
          onChange={setPickupLoc}
          error={errors.pickup}
          pinColor="text-emerald-500"
        />

        <LocationInput
          id="loc-dropoff"
          label="Final Dropoff"
          placeholder="Where is the destination? (e.g. Atlanta, GA)"
          value={dropoffLoc}
          onChange={setDropoffLoc}
          error={errors.dropoff}
          pinColor="text-rose-500"
        />
      </div>

      {/* Driver Cycle & Departure Time */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {/* Weekly Hours Used Slider */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="cycle-hours" className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-blue-500" />
              <span>Prior Hours Worked</span>
            </label>
            <span className="text-xs font-mono font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-500/20">
              {cycleUsed.toFixed(1)} / 70h
            </span>
          </div>

          <input
            id="cycle-hours"
            type="range"
            min="0"
            max="70"
            step="0.5"
            value={cycleUsed}
            onChange={(e) => setCycleUsed(parseFloat(e.target.value))}
            className="w-full accent-blue-600 dark:accent-blue-500 bg-slate-200 dark:bg-slate-800 h-1.5 rounded-lg cursor-pointer"
          />

          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
            <span>0h (Fresh)</span>
            <span>35h</span>
            <span>70h (Restart)</span>
          </div>
        </div>

        {/* Departure Time */}
        <StartTimePicker
          id="start-datetime"
          value={startTime}
          onChange={setStartTime}
          error={errors.start_time}
          disabled={isLoading}
        />
      </div>

      {/* Collapsible Carrier Details */}
      <div className="border-t border-slate-100 dark:border-slate-800/80 pt-2">
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="w-full py-1 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 flex items-center justify-between transition"
        >
          <span>Carrier &amp; vehicle details (Optional for log sheets)</span>
          {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showDetails && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs">
            <div>
              <label className="text-slate-600 dark:text-slate-400 mb-1 block">Carrier Name</label>
              <input
                type="text"
                value={carrierName}
                onChange={(e) => setCarrierName(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-slate-600 dark:text-slate-400 mb-1 block">Truck / Trailer Nos.</label>
              <input
                type="text"
                value={vehicleNo}
                onChange={(e) => setVehicleNo(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-slate-600 dark:text-slate-400 mb-1 block">Driver Name</label>
              <input
                type="text"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-slate-600 dark:text-slate-400 mb-1 block">Co-Driver Name</label>
              <input
                type="text"
                value={coDriver}
                onChange={(e) => setCoDriver(e.target.value)}
                placeholder="Optional"
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-slate-600 dark:text-slate-400 mb-1 block">BOL / Manifest No.</label>
              <input
                type="text"
                value={bolNo}
                onChange={(e) => setBolNo(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-slate-600 dark:text-slate-400 mb-1 block">Commodity</label>
              <input
                type="text"
                value={commodity}
                onChange={(e) => setCommodity(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-slate-600 dark:text-slate-400 mb-1 block">Main Office Address</label>
              <input
                type="text"
                value={mainOffice}
                onChange={(e) => setMainOffice(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-slate-600 dark:text-slate-400 mb-1 block">Home Terminal Address</label>
              <input
                type="text"
                value={homeTerminal}
                onChange={(e) => setHomeTerminal(e.target.value)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Primary Submit Button */}
      <button
        id="btn-calculate-route"
        type="submit"
        disabled={isLoading}
        className="w-full py-2.5 sm:py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium rounded-xl text-sm shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed focus-ring"
      >
        {isLoading ? (
          <>
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            <span>Calculating Route &amp; HOS Schedule...</span>
          </>
        ) : (
          <>
            <span>Plan Trip &amp; Generate Logs</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  );
};
