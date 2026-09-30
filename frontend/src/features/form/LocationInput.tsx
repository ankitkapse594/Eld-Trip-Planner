import React, { useState, useEffect, useRef } from "react";
import { MapPin, Search, Loader2, X } from "lucide-react";
import type { LocationPoint } from "../../types/trip";
import { searchGeocode } from "../../api/client";

interface LocationInputProps {
  id: string;
  label: string;
  placeholder: string;
  value: LocationPoint | null;
  onChange: (point: LocationPoint | null) => void;
  error?: string;
  required?: boolean;
}

export const LocationInput: React.FC<LocationInputProps> = ({
  id,
  label,
  placeholder,
  value,
  onChange,
  error,
  required = true,
}) => {
  const [query, setQuery] = useState(value ? value.label : "");
  const [suggestions, setSuggestions] = useState<LocationPoint[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      setQuery(value.label);
    } else {
      setQuery("");
    }
  }, [value]);

  // Debounced geocode query
  useEffect(() => {
    if (!query || (value && query === value.label)) {
      setSuggestions([]);
      return;
    }

    // Check if query looks like coordinates "lat, lng"
    const coordMatch = query.match(/^([-+]?\d{1,2}(?:\.\d+)?),\s*([-+]?\d{1,3}(?:\.\d+)?)$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[2]);
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        setSuggestions([
          {
            label: `Coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
            lat,
            lng,
          },
        ]);
        setIsOpen(true);
        return;
      }
    }

    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await searchGeocode(query);
        setSuggestions(results);
        setIsOpen(results.length > 0);
      } catch {
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleSelect = (pt: LocationPoint) => {
    onChange(pt);
    setQuery(pt.label);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setQuery("");
    setSuggestions([]);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label htmlFor={id} className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
        <span>{label} {required && <span className="text-amber-500">*</span>}</span>
        {value && (
          <span className="text-[10px] font-mono text-teal-400">
            {value.lat.toFixed(2)}, {value.lng.toFixed(2)}
          </span>
        )}
      </label>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <MapPin className="w-4 h-4 text-amber-500/80" />
        </div>

        <input
          id={id}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (value && e.target.value !== value.label) {
              onChange(null); // Clear selected point until picked
            }
          }}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          aria-label={label}
          autoComplete="off"
          className={`w-full pl-9 pr-10 py-2.5 bg-slate-900 border rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all ${
            error
              ? "border-red-500/70 focus:ring-red-500/30"
              : value
              ? "border-teal-500/40 focus:border-teal-500"
              : "border-slate-800 focus:border-amber-500"
          }`}
        />

        <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center gap-1">
          {isLoading && <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />}
          {!isLoading && query && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition"
              aria-label={`Clear ${label}`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {error && <p className="mt-1 text-xs text-red-400 font-medium">{error}</p>}

      {/* Autocomplete Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1.5 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden max-h-56 overflow-y-auto">
          <div className="px-3 py-1.5 bg-slate-800/50 border-b border-slate-800 text-[11px] font-medium text-slate-400 flex items-center justify-between">
            <span>Select Matching Waypoint</span>
            <Search className="w-3 h-3 text-slate-400" />
          </div>
          {suggestions.map((pt, idx) => (
            <button
              key={`${pt.label}-${idx}`}
              type="button"
              onClick={() => handleSelect(pt)}
              className="w-full text-left px-3.5 py-2.5 text-xs text-slate-200 hover:bg-amber-500/10 hover:text-amber-200 border-b border-slate-800/50 last:border-b-0 flex items-start gap-2.5 transition"
            >
              <MapPin className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate text-slate-100">{pt.label}</p>
                <p className="text-[10px] font-mono text-slate-400">
                  {pt.lat.toFixed(4)}, {pt.lng.toFixed(4)}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
