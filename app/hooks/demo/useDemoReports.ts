"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ReportsData,
  ReportsPageState,
  ReportsPageActions,
} from "@/app/lib/type/reports";

async function fetchDemoReportsDashboard(): Promise<ReportsData> {
  const res = await fetch("/api/demo/reports/dashboard", {
    method: "GET",
  });

  if (!res.ok) {
    throw new Error(`[useDemoReports] fetch failed: ${res.status}`);
  }

  return res.json();
}

// Demo-local mirror of useReportsData — same { state, actions } shape, but
// reads the public mock endpoint. The only "action" is a re-fetch (no
// mutations exist on the real reports page either).
export function useDemoReportsData(): {
  state: ReportsPageState;
  actions: ReportsPageActions;
} {
  const query = useQuery<ReportsData>({
    queryKey: ["demo", "reports", "dashboard"],
    queryFn: () => fetchDemoReportsDashboard(),
    staleTime: 1000 * 60 * 15,
    placeholderData: (previousData) => previousData,
  });

  const state: ReportsPageState = {
    data: query.data || null,
    loading: query.isLoading || query.isFetching,
    error: query.error ? String(query.error) : null,
  };

  const actions: ReportsPageActions = {
    fetchReports: async () => {
      await query.refetch();
    },
  };

  return { state, actions };
}
