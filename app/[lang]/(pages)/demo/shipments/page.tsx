/**
 * Live Demo — Shipments Page
 *
 * Mirrors the real shipments/page.tsx SSR-prefetch skeleton, but prefetches
 * the fixed mock dataset (no auth, no DB) into the SAME query key the demo
 * hook (useDemoShipmentsWithDashboard) uses.
 */

import type { Metadata } from "next";
import { Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { getShipmentsDashboardMock } from "@/app/lib/mocks/shipmentsMock";
import DemoShipmentContent from "./components/DemoShipmentContent";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Live Demo — Shipments | LogiTrack",
    description: "Explore the LogiTrack shipments dashboard with sample data.",
    robots: { index: false, follow: false },
  };
}

function ShipmentPageSkeleton() {
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

export default async function DemoShipmentPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
      },
    },
  });

  await queryClient.prefetchQuery({
    queryKey: ["demo", "shipments", "dashboard"],
    queryFn: () => Promise.resolve(getShipmentsDashboardMock()),
    staleTime: 1000 * 60 * 5,
  });

  const dehydratedState = dehydrate(queryClient);

  return (
    <HydrationBoundary state={dehydratedState}>
      <Suspense fallback={<ShipmentPageSkeleton />}>
        <DemoShipmentContent />
      </Suspense>
    </HydrationBoundary>
  );
}
