/**
 * Live Demo — Reports Page
 *
 * Mirrors the real reports/page.tsx SSR-prefetch skeleton, but prefetches the
 * fixed mock dataset (no auth, no DB) into the SAME query key the demo hook
 * (useDemoReportsData) uses.
 */

import type { Metadata } from "next";
import { Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { getReportsDashboardMock } from "@/app/lib/mocks/reportsMock";
import DemoReportsContent from "./components/DemoReportsContent";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Live Demo — Reports | LogiTrack",
    description: "Explore the LogiTrack reports dashboard with sample data.",
    robots: { index: false, follow: false },
  };
}

function ReportsPageSkeleton() {
  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center"
      width="100%"
      minHeight="60vh"
    >
      <CircularProgress size={36} />
    </Box>
  );
}

export default async function DemoReportsPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 15,
      },
    },
  });

  await queryClient.prefetchQuery({
    queryKey: ["demo", "reports", "dashboard"],
    queryFn: () => Promise.resolve(getReportsDashboardMock()),
    staleTime: 1000 * 60 * 15,
  });

  const dehydratedState = dehydrate(queryClient);

  return (
    <HydrationBoundary state={dehydratedState}>
      <Suspense fallback={<ReportsPageSkeleton />}>
        <DemoReportsContent />
      </Suspense>
    </HydrationBoundary>
  );
}
