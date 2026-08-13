"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  RouteWithRelations,
  RouteStats,
  RouteEfficiencyStats,
  MapRouteData,
} from "@/app/lib/type/routes";

async function fetchDemoRouteDashboard(): Promise<{
  routes: RouteWithRelations[];
  totalCount: number;
  stats: RouteStats;
  statsTrends?: {
    active?: { value: number; isUp: boolean };
    completedToday?: { value: number; isUp: boolean };
    delayed?: { value: number; isUp: boolean };
  };
  efficiency: RouteEfficiencyStats;
  mapData: MapRouteData[];
}> {
  const res = await fetch("/api/demo/routes/dashboard", {
    method: "GET",
  });

  if (!res.ok) {
    throw new Error(`[useDemoRoutes] fetch failed: ${res.status}`);
  }

  return res.json();
}

// Demo-local mirror of useRoutesWithDashboard — reads the public mock endpoint.
// Pagination/status params are accepted for signature parity with the real
// hook's call sites but are not sent anywhere (fixed mock dataset).
export function useDemoRoutesWithDashboard() {
  return useQuery({
    queryKey: ["demo", "routes", "dashboard"],
    queryFn: () => fetchDemoRouteDashboard(),
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
  });
}
