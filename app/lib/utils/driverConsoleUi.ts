import type { DutyStatus } from "../type/driverConsoleClient";

/** SVG path data for the driver-console sidebar nav, lifted from the approved mockup. */
export const I = {
  dashboard: "M3 21h18M4 21V9l8-4 8 4v12M9 21v-6h6v6",
  route: "M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11zM12 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  shipments: "M3 8l9-5 9 5v8l-9 5-9-5zM3 8l9 5 9-5M12 13v8",
  vehicle: "M3 17h1a2 2 0 1 0 4 0h8a2 2 0 1 0 4 0h1v-5l-3-4h-4v9M3 17V7h10v10M14 8h3l3 4",
  documents: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
};

export const DUTY_ORDER: DutyStatus[] = ["ON_JOB", "OFF_DUTY", "ON_LEAVE"];

export function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  return Math.round((new Date(iso).getTime() - Date.now()) / 86400000);
}

export function formatDuration(min: number | null): string {
  if (min == null) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}s ${m}dk` : `${m}dk`;
}
