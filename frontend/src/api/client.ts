import type { TripPlanRequest, TripPlanResponse, LocationPoint } from "../types/trip";

// In dev mode with no env var, default to http://localhost:8000.
// In production with no env var (or empty string), default to "" (relative same-origin).
// If an explicit VITE_API_BASE_URL is provided, use it (stripping any trailing slash).
const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const API_BASE_URL =
  typeof rawApiBaseUrl === "string" && rawApiBaseUrl.trim() !== ""
    ? rawApiBaseUrl.trim().replace(/\/+$/, "")
    : import.meta.env.DEV
    ? "http://localhost:8000"
    : "";

export class ApiError extends Error {
  status: number;
  details?: Record<string, any>;

  constructor(message: string, status: number, details?: Record<string, any>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s overall timeout

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(options.headers || {}),
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorData: any = {};
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: response.statusText };
      }

      const msg = errorData.message || errorData.error || `HTTP error ${response.status}`;
      throw new ApiError(msg, response.status, errorData.details);
    }

    return (await response.json()) as T;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new ApiError("The request timed out. Please try again.", 408);
    }
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(err.message || "Network connection error", 0);
  }
}

export async function planTrip(payload: TripPlanRequest): Promise<TripPlanResponse> {
  return request<TripPlanResponse>("/api/trips/plan/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function searchGeocode(query: string): Promise<LocationPoint[]> {
  if (!query || query.trim().length < 2) return [];
  return request<LocationPoint[]>(`/api/geocode/?q=${encodeURIComponent(query.trim())}`);
}

export async function checkBackendHealth(): Promise<{ status: string; provider: string; avg_speed_mph: number }> {
  return request<{ status: string; provider: string; avg_speed_mph: number }>("/api/health/");
}
