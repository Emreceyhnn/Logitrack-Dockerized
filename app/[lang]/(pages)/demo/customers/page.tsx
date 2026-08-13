/**
 * Live Demo — Customers Page
 *
 * Mirrors the real customers/page.tsx SSR-prefetch skeleton, but prefetches
 * the fixed mock dataset (no auth, no DB) into the SAME query key the demo hook
 * (useDemoCustomersWithDashboard) uses.
 */

import type { Metadata } from "next";
import { Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { getCustomersDashboardMock } from "@/app/lib/mocks/customersMock";
import DemoCustomerContent from "./components/DemoCustomerContent";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Live Demo — Customers | LogiTrack",
    description: "Explore the LogiTrack customers dashboard with sample data.",
    robots: { index: false, follow: false },
  };
}

function CustomersPageSkeleton() {
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

export default async function DemoCustomersPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
      },
    },
  });

  await queryClient.prefetchQuery({
    queryKey: ["demo", "customers", "dashboard"],
    queryFn: () => Promise.resolve(getCustomersDashboardMock()),
    staleTime: 1000 * 60 * 5,
  });

  const dehydratedState = dehydrate(queryClient);

  return (
    <HydrationBoundary state={dehydratedState}>
      <Suspense fallback={<CustomersPageSkeleton />}>
        <DemoCustomerContent />
      </Suspense>
    </HydrationBoundary>
  );
}
