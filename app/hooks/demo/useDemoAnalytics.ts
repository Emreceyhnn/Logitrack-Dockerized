"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import {
  AnalyticsDashboardData,
  AnalyticsPageState,
  AnalyticsPageActions,
} from "@/app/lib/type/analytics";

async function fetchDemoAnalyticsDashboard(): Promise<AnalyticsDashboardData> {
  const res = await fetch("/api/demo/analytics/dashboard", {
    method: "GET",
  });

  if (!res.ok) {
    throw new Error(`[useDemoAnalytics] fetch failed: ${res.status}`);
  }

  return res.json();
}

// Demo-local mirror of useAnalyticsData — reads the public mock endpoint
// under a distinct query key. Same { state, actions } return shape so
// DemoAnalyticsContent can reuse AnalyticsContent's JSX verbatim.
export function useDemoAnalyticsData(): {
  state: AnalyticsPageState;
  actions: AnalyticsPageActions;
} {
  const queryClient = useQueryClient();
  const query = useQuery<AnalyticsDashboardData>({
    queryKey: ["demo", "analytics", "dashboard"],
    queryFn: () => fetchDemoAnalyticsDashboard(),
    staleTime: 1000 * 60 * 10,
    placeholderData: (previousData) => previousData,
  });

  const fetchAnalytics = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: ["demo", "analytics", "dashboard"],
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
