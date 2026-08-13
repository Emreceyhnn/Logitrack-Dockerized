/**
 * Live Demo — Company Page
 *
 * Mirrors the real company/page.tsx SSR-prefetch skeleton, but prefetches the
 * fixed mock dataset (no auth, no DB) into the SAME query key the demo hook
 * (useDemoCompanyWithDashboard) uses.
 */

import type { Metadata } from "next";
import { Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { getCompanyDashboardMock } from "@/app/lib/mocks/companyMock";
import DemoCompanyContent from "./components/DemoCompanyContent";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Live Demo — Company | LogiTrack",
    description: "Explore the LogiTrack company dashboard with sample data.",
    robots: { index: false, follow: false },
  };
}

function CompanyPageSkeleton() {
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

export default async function DemoCompanyPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
      },
    },
  });

  await queryClient.prefetchQuery({
    queryKey: ["demo", "company", "dashboard"],
    queryFn: () => Promise.resolve(getCompanyDashboardMock()),
    staleTime: 1000 * 60 * 5,
  });

  const dehydratedState = dehydrate(queryClient);

  return (
    <HydrationBoundary state={dehydratedState}>
      <Suspense fallback={<CompanyPageSkeleton />}>
        <DemoCompanyContent />
      </Suspense>
    </HydrationBoundary>
  );
}
