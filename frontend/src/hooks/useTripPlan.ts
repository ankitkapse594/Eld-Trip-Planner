import { useState } from "react";
import { planTrip } from "../api/client";
import type { TripPlanRequest, TripPlanResponse } from "../types/trip";

export function useTripPlan() {
  const [data, setData] = useState<TripPlanResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const execute = async (request: TripPlanRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await planTrip(request);
      setData(result);
      return result;
    } catch (err: any) {
      setError(err.message || "Failed to plan trip");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { data, isLoading, error, execute, setData };
}
