export type DutyStatus = "OFF" | "SB" | "DRIVING" | "ON_DUTY";

export interface LocationPoint {
  label: string;
  lat: number;
  lng: number;
}

export interface RouteLeg {
  from: string;
  to: string;
  miles: number;
  hours: number;
}

export interface RouteData {
  geometry: [number, number][]; // [lat, lng] array
  legs: RouteLeg[];
}

export type StopType = "origin" | "pickup" | "dropoff" | "fuel" | "break" | "rest" | "restart";

export interface TripStop {
  id: string;
  type: StopType;
  label: string;
  location: LocationPoint;
  arrive: string; // ISO datetime
  depart: string; // ISO datetime
  duration_minutes: number;
  mile_marker: number;
  note: string;
}

export interface Segment {
  status: DutyStatus;
  start: string;
  end: string;
  duration_minutes: number;
  start_mi: number;
  end_mi: number;
  miles: number;
  location_index: number | null;
  reason: string;
}

export interface DailyLogRemark {
  time: string; // HH:MM
  location: string;
  note: string;
  status: DutyStatus;
}

export interface DailyLogRecap {
  on_duty_today: number;
  line_a: number; // 70hr/8day Line A: Total hours on duty last 7 days + today
  line_b: number; // Line B: 70 - A (Available tomorrow)
  line_c: number; // Line C: Total hours on duty last 5 days
}

export interface DailyLogHeader {
  date: string;
  date_iso: string;
  carrier_name: string;
  main_office_address: string;
  home_terminal_address: string;
  vehicle_numbers: string;
  driver_name: string;
  co_driver: string;
  shipper_commodity: string;
  shipping_doc_no: string;
  from_location: string;
  to_location: string;
}

export interface DailyLog {
  date: string;
  total_miles: number;
  total_mileage: number;
  hours: {
    off: number;
    sb: number;
    driving: number;
    on_duty: number;
  };
  segments: Segment[];
  remarks: DailyLogRemark[];
  recap: DailyLogRecap;
  header: DailyLogHeader;
}

export interface TripSummary {
  total_miles: number;
  driving_hours: number;
  trip_duration_hours: number;
  days: number;
  fuel_stops: number;
  rests: number;
  restarts: number;
  hos_valid: boolean;
  violations: string[];
}

export interface TripPlanResponse {
  summary: TripSummary;
  route: RouteData;
  stops: TripStop[];
  segments: Segment[];
  daily_logs: DailyLog[];
  assumptions: string[];
}

export interface TripPlanRequest {
  current_location: LocationPoint;
  pickup_location: LocationPoint;
  dropoff_location: LocationPoint;
  cycle_used_hours: number;
  start_datetime?: string | null;
  carrier_name?: string;
  main_office_address?: string;
  home_terminal_address?: string;
  vehicle_numbers?: string;
  driver_name?: string;
  co_driver?: string;
  shipper_commodity?: string;
  shipping_doc_no?: string;
  offline?: boolean;
}

export interface GeocodeResult {
  label: string;
  lat: number;
  lng: number;
}
