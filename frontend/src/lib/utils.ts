/**
 * Utility helper functions for ELD Trip Planner
 */

export function formatMinutesToHours(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hrs}h ${mins}m`;
}

export function formatNumber(val: number, decimals: number = 2): string {
  return Number(val).toFixed(decimals);
}
