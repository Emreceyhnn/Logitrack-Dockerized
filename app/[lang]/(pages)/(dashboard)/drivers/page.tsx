/**
 * Driver Page — Hybrid SSR + CSR
 *
 * Rendering Strategy
 * ──────────────────
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  SERVER (this file)                                                 │
 * │  1. Call getDriverWithDashboardData() directly — hits Redis first,  │
 * │     falls back to Prisma if cache cold. No extra round-trip.        │
 * │  3. Serialize data into TanStack Query's dehydrated state.          │
 * │  4. Stream HTML to the browser — users see populated content        │
 * │     immediately, no loading spinner on first paint.                 │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │  CLIENT (DriverContent.tsx)                                         │
 * │  5. HydrationBoundary rehydrates the dehydrated state into the      │
 * │     existing QueryClient — cache is warm on the first render.       │
 * │  6. useDriverWithDashboard() finds the data in cache →              │
 * │     isLoading = false, no network call on mount.                    │
 * │  7. When the user applies filters the hook issues a fresh CSR       │
 * │     request and reactively updates the UI.                          │
 * └─────────────────────────────────────────────────────────────────────┘
 */

import type { Metadata } from "next";
import { getDictionary } from "@/app/lib/language/language";
import { Suspense } from "react";
import { Box, CircularProgress } from "@mui/material";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { getDriverWithDashboardData } from "@/app/lib/controllers/driver";
import { driverKeys } from "@/app/lib/query-keys/driver.keys";
import DriverContent from "./components/DriverContent";
import { logger } from "@/app/lib/logger";


export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return {
    title: dict.drivers.title,
    description: dict.drivers.subtitle,
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

export default async function DriverPage() {

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
      },
    },
  });

  const defaultFilters = {
    page: 1,
    limit: 10,
    search: "",
    status: [],
    hasVehicle: undefined,
    sortField: "createdAt",
    sortOrder: "desc" as const,
  };

  try {
    // Note: We need to use the exact same key as in useDriverWithDashboard
    await queryClient.prefetchQuery({
      queryKey: driverKeys.dashboardWithFilters(defaultFilters),
      queryFn: () => getDriverWithDashboardData(defaultFilters),
      staleTime: 1000 * 60 * 5,
    });
  } catch (error) {
    logger.error("[DriverPage SSR] prefetch failed:", error);
  }

  const dehydratedState = dehydrate(queryClient);

  return (
    <HydrationBoundary state={dehydratedState}>
      <Suspense fallback={<DriverPageSkeleton />}>
        <DriverContent />
      </Suspense>
    </HydrationBoundary>
  );
}
