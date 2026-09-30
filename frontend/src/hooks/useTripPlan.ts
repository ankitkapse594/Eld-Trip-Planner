import { useMutation } from "@tanstack/react-query";
import { planTrip, ApiError } from "../api/client";
import type { TripPlanRequest, TripPlanResponse } from "../types/trip";

/**
 * TanStack Query Mutation hook for executing FMCSA trip planning requests.
 * Manages pending states, errors, and cached trip responses.
 */
export function useTripPlanMutation() {
  return useMutation<TripPlanResponse, ApiError, TripPlanRequest>({
    mutationKey: ["trip-plan"],
    mutationFn: (request: TripPlanRequest) => planTrip(request),
  });
}

/**
 * Convenience alias hook
 */
export function useTripPlan() {
  return useTripPlanMutation();
}
