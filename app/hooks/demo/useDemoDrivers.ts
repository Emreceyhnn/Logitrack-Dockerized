"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import {
  DriverWithRelations,
  DriverDashboardResponseType,
} from "@/app/lib/type/driver";

async function fetchDemoDriverDashboard(): Promise<{
  drivers: DriverWithRelations[];
  meta: { total: number; page: number; limit: number; totalPages: number };
  driversKpis: DriverDashboardResponseType["driversKpis"];
  topPerformers: DriverDashboardResponseType["topPerformers"];
  performanceCharts: DriverDashboardResponseType["performanceCharts"];
  kpiTrends: DriverDashboardResponseType["kpiTrends"];
}> {
  const res = await fetch("/api/demo/drivers/dashboard", {
    method: "GET",
  });

  if (!res.ok) {
    throw new Error(`[useDemoDrivers] fetch failed: ${res.status}`);
  }

  return res.json();
}

// Demo-local mirror of useDriverWithDashboard — reads the public mock endpoint.
// Pagination/filter/sort params are accepted for signature parity with the real
// hook's call sites but are not sent anywhere (fixed mock dataset).
export function useDemoDriverWithDashboard() {
  return useQuery({
    queryKey: ["demo", "drivers", "dashboard"],
    queryFn: () => fetchDemoDriverDashboard(),
    staleTime: 1000 * 60 * 5,
    placeholderData: keepPreviousData,
  });
}
