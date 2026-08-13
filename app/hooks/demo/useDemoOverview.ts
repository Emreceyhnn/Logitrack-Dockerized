"use client";

import { useQuery } from "@tanstack/react-query";
import { DashboardData, ActionRequiredItems } from "@/app/lib/type/overview";

async function fetchDemoOverviewDashboard(): Promise<
  DashboardData & { alerts: ActionRequiredItems[] }
> {
  const res = await fetch("/api/demo/overview/dashboard", {
    method: "GET",
  });

  if (!res.ok) {
    throw new Error(`[useDemoOverview] fetch failed: ${res.status}`);
  }

  return res.json();
}

// Demo-local mirror of useOverviewData — same return shape, but reads from
// the public mock endpoint under a distinct query key so it never shares
// cache with the real authenticated hook.
export function useDemoOverview() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery<
    DashboardData & { alerts: ActionRequiredItems[] }
  >({
    queryKey: ["demo", "overview", "dashboard"],
    queryFn: () => fetchDemoOverviewDashboard(),
    staleTime: 1000 * 60 * 5,
    placeholderData: (previousData) => previousData,
  });

  return {
    data: {
      stats: data?.stats ?? null,
      statsTrends: data?.statsTrends ?? undefined,
      alerts: data?.alerts ?? [],
      dailyOps: data?.dailyOps ?? null,
      fuelStats: data?.fuelStats ?? [],
      fuelLogs: data?.fuelLogs ?? [],
      warehouseCapacity: data?.warehouseCapacity ?? [],
      lowStockItems: data?.lowStockItems ?? [],
      shipmentStatus: data?.shipmentStatus ?? [],
      picksAndPacks: data?.picksAndPacks ?? null,
      shipmentVolume: data?.shipmentVolume ?? [],
      mapData: data?.mapData ?? [],
    },
    isLoading,
    isFetching,
    isError,
    refetch,
  };
}
