"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  VehicleDashboardResponseType,
  VehicleWithRelations,
} from "@/app/lib/type/vehicle";
import type { TrailerWithRelations } from "@/app/lib/type/trailer";

async function fetchDemoVehicleDashboard(): Promise<
  VehicleDashboardResponseType & { vehicles: VehicleWithRelations[] }
> {
  const res = await fetch("/api/demo/vehicles/dashboard", {
    method: "GET",
  });

  if (!res.ok) {
    throw new Error(`[useDemoVehicles] fetch failed: ${res.status}`);
  }

  return res.json();
}

// Demo-local mirror of useVehicleWithDashboard — reads the public mock
// endpoint under a distinct query key.
export function useDemoVehicleWithDashboard() {
  return useQuery({
    queryKey: ["demo", "vehicles", "dashboard"],
    queryFn: () => fetchDemoVehicleDashboard(),
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
  });
}

// Demo-local mirror of useTrailers — the Vehicle page's second tab. Backed by
// the same fixed vehicle-dashboard mock payload isn't enough (trailers have a
// distinct shape), so this reads a small embedded trailer list computed
// client-side from the mock module directly (no extra API route needed since
// it's pure static data).
export function useDemoTrailers() {
  return useQuery<{
    trailers: TrailerWithRelations[];
    kpis: { total: number; available: number; inUse: number; maintenance: number; issues: number };
    meta: { total: number; page: number; limit: number };
  }>({
    queryKey: ["demo", "trailers", "dashboard"],
    queryFn: async () => {
      const { getTrailerDashboardMock } = await import("@/app/lib/mocks/vehicleMock");
      return getTrailerDashboardMock();
    },
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
  });
}
