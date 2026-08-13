import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { analyticsKeys } from "@/app/lib/query-keys/analytics.keys";
import {
  AnalyticsDashboardData,
  AnalyticsPageState,
  AnalyticsPageActions,
} from "@/app/lib/type/analytics";

async function fetchAnalyticsDashboard(): Promise<AnalyticsDashboardData> {
  const res = await fetch("/api/analytics/dashboard", {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(`[useAnalyticsData] fetch failed: ${res.status}`);
  }

  return res.json();
}

export function useAnalyticsData(): {
  state: AnalyticsPageState;
  actions: AnalyticsPageActions;
} {
  const queryClient = useQueryClient();
  const query = useQuery<AnalyticsDashboardData>({
    queryKey: analyticsKeys.dashboard(),
    queryFn: () => fetchAnalyticsDashboard(),
    staleTime: 1000 * 60 * 10,
    placeholderData: (previousData) => previousData,
  });

  const fetchAnalytics = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: analyticsKeys.dashboard(),
    });
  }, [queryClient]);

  const state: AnalyticsPageState = {
    data: query.data || null,
    loading: query.isLoading || query.isFetching,
    error: query.error ? String(query.error) : null,
  };

  const actions: AnalyticsPageActions = {
    fetchAnalytics,
  };

  return { state, actions };
}
