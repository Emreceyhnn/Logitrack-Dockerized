import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { reportsKeys } from "@/app/lib/query-keys/reports.keys";
import {
  ReportsData,
  ReportsPageState,
  ReportsPageActions,
} from "@/app/lib/type/reports";

async function fetchReportsDashboard(): Promise<ReportsData> {
  const res = await fetch("/api/reports/dashboard", {
    method: "GET",
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(`[useReportsData] fetch failed: ${res.status}`);
  }

  return res.json();
}

export function useReportsData(): {
  state: ReportsPageState;
  actions: ReportsPageActions;
} {
  const queryClient = useQueryClient();
  const query = useQuery<ReportsData>({
    queryKey: reportsKeys.dashboard(),
    queryFn: () => fetchReportsDashboard(),
    staleTime: 1000 * 60 * 15,
    placeholderData: (previousData) => previousData,
  });

  const fetchReports = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: reportsKeys.dashboard() });
  }, [queryClient]);

  const state: ReportsPageState = {
    data: query.data || null,
    loading: query.isLoading || query.isFetching,
    error: query.error ? String(query.error) : null,
  };

  const actions: ReportsPageActions = {
    fetchReports,
  };

  return { state, actions };
}
