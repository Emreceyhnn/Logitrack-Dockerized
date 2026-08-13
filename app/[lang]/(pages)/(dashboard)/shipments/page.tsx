/**
 * Shipments Page — Hybrid SSR + CSR
 *
 * Rendering Strategy
 * ──────────────────
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  SERVER (this file)                                                 │
 * │  1. Call getShipmentsWithDashboardData() directly — hits Redis first│
 * │     falls back to Prisma if cache cold. No extra round-trip.        │
 * │  3. Serialize data into TanStack Query's dehydrated state.          │
 * │  4. Stream HTML to the browser — users see populated content        │
 * │     immediately, no loading spinner on first paint.                 │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │  CLIENT (shipmentsContent.tsx)                                      │
 * │  5. HydrationBoundary rehydrates the dehydrated state into the      │
 * │     existing QueryClient — cache is warm on the first render.       │
 * │  6. useShipmentsWithDashboard() finds the data in cache →           │
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
import { getShipmentsWithDashboardData } from "@/app/lib/controllers/shipments";
import { shipmentKeys } from "@/app/lib/query-keys/shipment.keys";
import ShipmentContent from "./components/shipmentsContent";
import { logger } from "@/app/lib/logger";


export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return {
    title: dict.shipments.title,
    description: dict.shipments.subtitle,
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

export default async function ShipmentPage() {

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
      },
    },
  });

  const clientPage = 1;
  const serverPage = clientPage;
  const pageSize = 10;
  const status = undefined;
  const search = undefined;

  try {
    await queryClient.prefetchQuery({
      queryKey: shipmentKeys.dashboardWithFilters(clientPage, pageSize, status, search),
      queryFn: () => getShipmentsWithDashboardData(serverPage, pageSize, status, search),
      staleTime: 1000 * 60 * 5,
    });
  } catch (error) {
    logger.error("[ShipmentPage SSR] prefetch failed:", error);
  }

  const dehydratedState = dehydrate(queryClient);

  return (
    <HydrationBoundary state={dehydratedState}>
      <Suspense fallback={<ShipmentPageSkeleton />}>
        <ShipmentContent />
      </Suspense>
    </HydrationBoundary>
  );
}
