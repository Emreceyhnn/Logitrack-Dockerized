/**
 * Live Demo — Routes Page
 *
 * Mirrors the real routes/page.tsx SSR-prefetch skeleton, but prefetches the
 * fixed mock dataset (no auth, no DB) into the SAME query key the demo hook
 * (useDemoRoutesWithDashboard) uses.
 */

import type { Metadata } from "next";
import { Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { getRoutesDashboardMock } from "@/app/lib/mocks/routesMock";
import DemoRoutesContent from "./components/DemoRoutesContent";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Live Demo — Routes | LogiTrack",
    description: "Explore the LogiTrack routes dashboard with sample data.",
    robots: { index: false, follow: false },
  };
}

function RoutesPageSkeleton() {
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

export default async function DemoRoutesPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
      },
    },
  });

  await queryClient.prefetchQuery({
    queryKey: ["demo", "routes", "dashboard"],
    queryFn: () => Promise.resolve(getRoutesDashboardMock()),
    staleTime: 1000 * 60 * 5,
  });

  const dehydratedState = dehydrate(queryClient);

  return (
    <HydrationBoundary state={dehydratedState}>
      <Suspense fallback={<RoutesPageSkeleton />}>
        <div>
          <DemoRoutesContent />
        </div>
      </Suspense>
    </HydrationBoundary>
  );
}
