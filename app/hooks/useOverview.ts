import { overviewKeys } from "@/app/lib/query-keys/overview.keys";
import { useQuery } from "@tanstack/react-query";
import { DashboardData, ActionRequiredItems } from "@/app/lib/type/overview";

async function fetchOverviewDashboard(): Promise<
  DashboardData & { alerts: ActionRequiredItems[] }
> {
  const res = await fetch("/api/overview/dashboard", {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(`[useOverviewData] fetch failed: ${res.status}`);
  }

  return res.json();
}

export function useOverviewData() {
  const { data, isLoading, isError, refetch, isFetching } = useQuery<
    DashboardData & { alerts: ActionRequiredItems[] }
  >({
    queryKey: overviewKeys.dashboard(),
    queryFn: () => fetchOverviewDashboard(),
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
