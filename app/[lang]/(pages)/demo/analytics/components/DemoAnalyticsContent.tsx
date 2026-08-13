"use client";

import { Box, Skeleton, Stack } from "@mui/material";
import AnalyticsHeader from "@/app/components/dashboard/analytics/AnalyticsHeader";
import dynamic from "next/dynamic";
import ChartSkeleton from "@/app/components/skeletons/ChartSkeleton";

// @mui/x-charts is ~283 kB per route when imported statically. Loading the
// chart components lazily keeps it out of this route's First Load JS.
const PerformanceGauges = dynamic(
  () => import("@/app/components/dashboard/analytics/PerformanceGauges"),
  { ssr: false, loading: () => <ChartSkeleton /> }
);
const CostAnalysisCharts = dynamic(
  () => import("@/app/components/dashboard/analytics/CostAnalysisCharts"),
  { ssr: false, loading: () => <ChartSkeleton /> }
);
const ForecastingWidget = dynamic(
  () => import("@/app/components/dashboard/analytics/ForecastingWidget"),
  { ssr: false, loading: () => <ChartSkeleton /> }
);
import { useDemoAnalyticsData } from "@/app/hooks/demo/useDemoAnalytics";
import QueryErrorState from "@/app/components/ui/QueryErrorState";

export default function DemoAnalyticsContent() {
  const { state, actions } = useDemoAnalyticsData();

  if (state.error && !state.data) {
    return (
      <Box position={"relative"} p={{ xs: 2, md: 4 }} width={"100%"}>
        <AnalyticsHeader />
        <QueryErrorState onRetry={() => actions.fetchAnalytics()} />
      </Box>
    );
  }

  if (state.loading && !state.data) {
    return (
      <Box position={"relative"} p={{ xs: 2, md: 4 }} width={"100%"}>
        <AnalyticsHeader />
        <Stack spacing={3} mt={3}>
          <Skeleton variant="rounded" height={200} sx={{ borderRadius: "16px" }} />
          <Skeleton variant="rounded" height={400} sx={{ borderRadius: "16px" }} />
          <Skeleton variant="rounded" height={300} sx={{ borderRadius: "16px" }} />
        </Stack>
      </Box>
    );
  }

  return (
    <Box position={"relative"} p={{ xs: 2, md: 4 }} width={"100%"}>
      <Box data-tour="analytics-header">
        <AnalyticsHeader />
      </Box>

      <Box data-tour="performance-gauges" sx={{ mb: 4 }}>
        <PerformanceGauges state={state.data?.performance ?? null} />
      </Box>

      <Box data-tour="forecasting-widget" sx={{ mb: 4 }}>
        <ForecastingWidget state={state.data?.forecast ?? null} />
      </Box>

      <Box data-tour="cost-analysis">
        <CostAnalysisCharts state={state.data?.costs ?? null} />
      </Box>
    </Box>
  );
}
