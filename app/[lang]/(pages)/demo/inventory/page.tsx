/**
 * Live Demo — Inventory Page
 *
 * Mirrors the real inventory/page.tsx SSR-prefetch skeleton, but prefetches
 * the fixed mock dataset (no auth, no DB) into the SAME query key the demo hook
 * (useDemoInventoryWithDashboard) uses.
 */

import type { Metadata } from "next";
import { Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { getInventoryDashboardMock } from "@/app/lib/mocks/inventoryMock";
import DemoInventoryContent from "./components/DemoInventoryContent";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Live Demo — Inventory | LogiTrack",
    description: "Explore the LogiTrack inventory dashboard with sample data.",
    robots: { index: false, follow: false },
  };
}

function InventoryPageSkeleton() {
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

export default async function DemoInventoryPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
      },
    },
  });

  await queryClient.prefetchQuery({
    queryKey: ["demo", "inventory", "dashboard"],
    queryFn: () => Promise.resolve(getInventoryDashboardMock()),
    staleTime: 1000 * 60 * 5,
  });

  const dehydratedState = dehydrate(queryClient);

  return (
    <HydrationBoundary state={dehydratedState}>
      <Suspense fallback={<InventoryPageSkeleton />}>
        <DemoInventoryContent />
      </Suspense>
    </HydrationBoundary>
  );
}
