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
  pinColor?: string;
}

export const LocationInput: React.FC<LocationInputProps> = ({
  id,
  label,
  placeholder,
  value,
  onChange,
  error,
  required = true,
  pinColor = "text-slate-400 dark:text-slate-500",
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
    <div className="space-y-1.5" ref={dropdownRef}>
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-xs font-medium text-slate-700 dark:text-slate-300">
          {label} {required && <span className="text-blue-500">*</span>}
        </label>
        {value && (
          <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
            {value.lat.toFixed(2)}, {value.lng.toFixed(2)}
          </span>
        )}
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MapPin className={`w-4 h-4 ${pinColor}`} />
        </div>

        <input
          id={id}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (value && e.target.value !== value.label) {
              onChange(null);
            }
          }}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          autoComplete="off"
          className={`w-full bg-white dark:bg-slate-900 border rounded-xl pl-9 pr-9 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
            error
              ? "border-red-400 dark:border-red-500/80 focus:border-red-500"
              : value
              ? "border-slate-300 dark:border-slate-700 focus:border-blue-500"
              : "border-slate-200 dark:border-slate-800 focus:border-blue-500"
          }`}
        />

        <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center gap-1">
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin" />
          ) : query ? (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition"
              title="Clear location"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600" />
          )}
        </div>

        {/* Autocomplete Dropdown */}
        {isOpen && suggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg overflow-hidden py-1 max-h-56 overflow-y-auto">
            {suggestions.map((pt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelect(pt)}
                className="w-full text-left px-3.5 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/50 last:border-b-0 text-xs"
              >
                <div className="flex items-center gap-2 truncate">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-slate-800 dark:text-slate-200 font-medium truncate">
                    {pt.label}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 shrink-0">
                  {pt.lat.toFixed(2)}, {pt.lng.toFixed(2)}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-[11px] text-red-500 dark:text-red-400 font-medium">{error}</p>}
    </div>
  );
};
