/**
 * Routes Page — Hybrid SSR + CSR
 *
 * Rendering Strategy
 * ──────────────────
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  SERVER (this file)                                                 │
 * │  1. Call getRoutesWithDashboardData() directly — hits Redis first,  │
 * │     falls back to Prisma if cache cold. No extra round-trip.        │
 * │  3. Serialize data into TanStack Query's dehydrated state.          │
 * │  4. Stream HTML to the browser — users see populated content        │
 * │     immediately, no loading spinner on first paint.                 │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │  CLIENT (routesContent.tsx)                                         │
 * │  5. HydrationBoundary rehydrates the dehydrated state into the      │
 * │     existing QueryClient — cache is warm on the first render.       │
 * │  6. useRoutesWithDashboard() finds the data in cache →              │
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
import { getRoutesWithDashboardData } from "@/app/lib/controllers/routes";
import { routeKeys } from "@/app/lib/query-keys/route.keys";
import RoutesContent from "./components/routesContent";
import { logger } from "@/app/lib/logger";


export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return {
    title: dict.routes.title,
    description: dict.routes.subtitle,
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

export default async function RoutesPage() {

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
      },
    },
  });

  const clientPage = 0;
  const serverPage = clientPage + 1;
  const pageSize = 10;
  const status = undefined;

  try {
    await queryClient.prefetchQuery({
      queryKey: routeKeys.dashboardWithFilters(clientPage, pageSize, status),
      queryFn: () => getRoutesWithDashboardData(serverPage, pageSize, status),
      staleTime: 1000 * 60 * 5,
    });
  } catch (error) {
    logger.error("[RoutesPage SSR] prefetch failed:", error);
  }

  const dehydratedState = dehydrate(queryClient);

  return (
    <HydrationBoundary state={dehydratedState}>
      <Suspense fallback={<RoutesPageSkeleton />}>
        <div>
          <RoutesContent />
        </div>
      </Suspense>
    </HydrationBoundary>
  );
}
