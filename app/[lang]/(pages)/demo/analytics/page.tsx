/**
 * Live Demo — Analytics Page
 *
 * Mirrors the real analytics/page.tsx SSR-prefetch skeleton, but prefetches
 * the fixed mock dataset (no auth, no DB) into the SAME query key the demo
 * hook (useDemoAnalyticsData) uses.
 */

import type { Metadata } from "next";
import { Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { getAnalyticsMock } from "@/app/lib/mocks/analyticsMock";
import DemoAnalyticsContent from "./components/DemoAnalyticsContent";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Live Demo — Analytics | LogiTrack",
    description: "Explore the LogiTrack analytics dashboard with sample data.",
    robots: { index: false, follow: false },
  };
}

function AnalyticsPageSkeleton() {
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

export default async function DemoAnalyticsPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 10,
      },
    },
  });

  await queryClient.prefetchQuery({
    queryKey: ["demo", "analytics", "dashboard"],
    queryFn: () => Promise.resolve(getAnalyticsMock()),
    staleTime: 1000 * 60 * 10,
  });

  const dehydratedState = dehydrate(queryClient);

  return (
    <HydrationBoundary state={dehydratedState}>
      <Suspense fallback={<AnalyticsPageSkeleton />}>
        <DemoAnalyticsContent />
      </Suspense>
    </HydrationBoundary>
  );
}
