import React, { useState } from "react";
import { Sparkles, Calendar, ChevronDown, ChevronUp, Navigation, Sliders } from "lucide-react";
import type { LocationPoint, TripPlanRequest } from "../../types/trip";
import { LocationInput } from "./LocationInput";

interface TripFormProps {
  onSubmit: (data: TripPlanRequest) => void;
  isLoading: boolean;
}

export const TripForm: React.FC<TripFormProps> = ({ onSubmit, isLoading }) => {
  const [currentLoc, setCurrentLoc] = useState<LocationPoint | null>(null);
  const [pickupLoc, setPickupLoc] = useState<LocationPoint | null>(null);
  const [dropoffLoc, setDropoffLoc] = useState<LocationPoint | null>(null);
  const [cycleUsed, setCycleUsed] = useState<number>(32.5);

  // Default to today rounded to next 15-min mark
  const getDefaultStartTime = () => {
    const d = new Date();
    const min = Math.ceil(d.getMinutes() / 15) * 15;
    d.setMinutes(min, 0, 0);
    // Format YYYY-MM-DDTHH:mm
    const tzOffset = d.getTimezoneOffset() * 60000;
    const localISOTime = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
    return localISOTime;
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
  const [commodity, setCommodity] = useState<string>("Apex Industrial / Automotive Components");
  const [bolNo, setBolNo] = useState<string>("BOL-8829104");

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!currentLoc) errs.current = "Current location is required.";
    if (!pickupLoc) errs.pickup = "Pickup location is required.";
    if (!dropoffLoc) errs.dropoff = "Dropoff location is required.";
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
    <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      {/* Header and Example Trip Button */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Navigation className="w-4 h-4 text-amber-500" />
            Dispatch Trip Plan
          </h2>
          <p className="text-xs text-slate-400">Specify waypoints and driver cycle status</p>
        </div>

        <button
          type="button"
          onClick={handleFillExample}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold transition shadow-sm hover:border-amber-500/50"
          title="Fills Chicago -> Dallas -> Atlanta with 40h cycle"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Try example trip</span>
        </button>
      </div>

      {/* Waypoint Locations */}
      <div className="space-y-3">
        <LocationInput
          id="loc-current"
          label="1. Current Location"
          placeholder="e.g. Chicago, IL or 41.8781, -87.6298"
          value={currentLoc}
          onChange={setCurrentLoc}
          error={errors.current}
        />

        <LocationInput
          id="loc-pickup"
          label="2. Pickup Location (Loading)"
          placeholder="e.g. Dallas, TX"
          value={pickupLoc}
          onChange={setPickupLoc}
          error={errors.pickup}
        />

        <LocationInput
          id="loc-dropoff"
          label="3. Dropoff Location (Unloading)"
          placeholder="e.g. Atlanta, GA"
          value={dropoffLoc}
          onChange={setDropoffLoc}
          error={errors.dropoff}
        />
      </div>

      {/* Cycle Hours Slider & Datetime */}
      <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="cycle-hours" className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-amber-500" />
              Prior Cycle Used
            </label>
            <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              {cycleUsed.toFixed(1)} / 70.0 hrs
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
            className="w-full accent-amber-500 bg-slate-800 h-1.5 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
            <span>0.0h (Fresh)</span>
            <span>35.0h</span>
            <span>70.0h (Restart)</span>
          </div>
        </div>

        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
          <label htmlFor="start-datetime" className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-teal-400" />
            Home Terminal Departure
          </label>
          <input
            id="start-datetime"
            type="datetime-local"
            step="900"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500 font-mono"
          />
          <p className="text-[10px] text-slate-500 mt-1">15-minute rounded local terminal time</p>
        </div>
      </div>

      {/* Collapsible Details */}
      <div className="border-t border-slate-800/80 pt-2">
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          className="w-full py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 flex items-center justify-between transition"
        >
          <span>Carrier, Vehicle &amp; BOL Information (For Paper Logs)</span>
          {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showDetails && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-slate-950/40 p-3 rounded-xl border border-slate-800/80 text-xs">
            <div>
              <label className="text-slate-400 mb-1 block">Carrier Name</label>
              <input
                type="text"
                value={carrierName}
                onChange={(e) => setCarrierName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200"
              />
            </div>
            <div>
              <label className="text-slate-400 mb-1 block">Truck / Trailer Nos.</label>
              <input
                type="text"
                value={vehicleNo}
                onChange={(e) => setVehicleNo(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200"
              />
            </div>
            <div>
              <label className="text-slate-400 mb-1 block">Driver Name</label>
              <input
                type="text"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200"
              />
            </div>
            <div>
              <label className="text-slate-400 mb-1 block">Co-Driver Name</label>
              <input
                type="text"
                value={coDriver}
                onChange={(e) => setCoDriver(e.target.value)}
                placeholder="Optional"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200"
              />
            </div>
            <div>
              <label className="text-slate-400 mb-1 block">BOL / Manifest No.</label>
              <input
                type="text"
                value={bolNo}
                onChange={(e) => setBolNo(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-slate-400 mb-1 block">Shipper &amp; Commodity</label>
              <input
                type="text"
                value={commodity}
                onChange={(e) => setCommodity(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200"
              />
            </div>
            <div>
              <label className="text-slate-400 mb-1 block">Main Office Address</label>
              <input
                type="text"
                value={mainOffice}
                onChange={(e) => setMainOffice(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200"
              />
            </div>
            <div>
              <label className="text-slate-400 mb-1 block">Home Terminal Address</label>
              <input
                type="text"
                value={homeTerminal}
                onChange={(e) => setHomeTerminal(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200"
              />
            </div>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <button
        id="btn-calculate-route"
        type="submit"
        disabled={isLoading}
        className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <span className="inline-block w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></span>
            <span>Calculating Compliant HOS Route...</span>
          </>
        ) : (
          <>
            <Navigation className="w-4 h-4 fill-slate-950" />
            <span>Generate Route &amp; ELD Logs</span>
          </>
        )}
      </button>
    </form>
  );
};
