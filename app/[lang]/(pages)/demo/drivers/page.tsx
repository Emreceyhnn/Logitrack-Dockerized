/**
 * Live Demo — Drivers Page
 *
 * Mirrors the real drivers/page.tsx SSR-prefetch skeleton, but prefetches the
 * fixed mock dataset (no auth, no DB) into the SAME query key the demo hook
 * (useDemoDriverWithDashboard) uses.
 */

import type { Metadata } from "next";
import { Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { getDriversDashboardMock } from "@/app/lib/mocks/driversMock";
import DemoDriverContent from "./components/DemoDriverContent";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Live Demo — Drivers | LogiTrack",
    description: "Explore the LogiTrack drivers dashboard with sample data.",
    robots: { index: false, follow: false },
  };
}

function DriverPageSkeleton() {
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

export default async function DemoDriverPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
      },
    },
  });

  await queryClient.prefetchQuery({
    queryKey: ["demo", "drivers", "dashboard"],
    queryFn: () => Promise.resolve(getDriversDashboardMock()),
    staleTime: 1000 * 60 * 5,
  });

  const dehydratedState = dehydrate(queryClient);

  return (
    <HydrationBoundary state={dehydratedState}>
      <Suspense fallback={<DriverPageSkeleton />}>
        <DemoDriverContent />
      </Suspense>
    </HydrationBoundary>
  );
}
