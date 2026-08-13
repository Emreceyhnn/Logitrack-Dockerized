/**
 * Live Demo — Vehicle Page
 *
 * Mirrors the real vehicle/page.tsx SSR-prefetch skeleton, but prefetches
 * the fixed mock dataset (no auth, no DB) into the SAME query key the demo
 * hook (useDemoVehicleWithDashboard) uses.
 */

import type { Metadata } from "next";
import { Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { getVehicleDashboardMock } from "@/app/lib/mocks/vehicleMock";
import DemoVehicleContent from "./components/DemoVehicleContent";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Live Demo — Vehicles | LogiTrack",
    description: "Explore the LogiTrack vehicle dashboard with sample data.",
    robots: { index: false, follow: false },
  };
}

function VehiclePageSkeleton() {
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

export default async function DemoVehiclePage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
      },
    },
  });

  await queryClient.prefetchQuery({
    queryKey: ["demo", "vehicles", "dashboard"],
    queryFn: () => Promise.resolve(getVehicleDashboardMock()),
    staleTime: 1000 * 60 * 5,
  });

  const dehydratedState = dehydrate(queryClient);

  return (
    <HydrationBoundary state={dehydratedState}>
      <Suspense fallback={<VehiclePageSkeleton />}>
        <DemoVehicleContent />
      </Suspense>
    </HydrationBoundary>
  );
}
