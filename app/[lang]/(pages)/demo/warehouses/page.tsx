/**
 * Live Demo — Warehouses Page
 *
 * Mirrors the real warehouses/page.tsx SSR-prefetch skeleton, but prefetches
 * the fixed mock dataset (no auth, no DB) into the SAME query key the demo hook
 * (useDemoWarehousesWithDashboard) uses.
 */

import type { Metadata } from "next";
import { Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { getWarehousesDashboardMock } from "@/app/lib/mocks/warehousesMock";
import DemoWarehouseContent from "./components/DemoWarehouseContent";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Live Demo — Warehouses | LogiTrack",
    description: "Explore the LogiTrack warehouses dashboard with sample data.",
    robots: { index: false, follow: false },
  };
}

function WarehousePageSkeleton() {
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

export default async function DemoWarehousePage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
      },
    },
  });

  await queryClient.prefetchQuery({
    queryKey: ["demo", "warehouses", "dashboard"],
    queryFn: () => Promise.resolve(getWarehousesDashboardMock()),
    staleTime: 1000 * 60 * 5,
  });

  const dehydratedState = dehydrate(queryClient);

  return (
    <HydrationBoundary state={dehydratedState}>
      <Suspense fallback={<WarehousePageSkeleton />}>
        <DemoWarehouseContent />
      </Suspense>
    </HydrationBoundary>
  );
}
