/**
 * Vehicle Page — Hybrid SSR + CSR
 *
 * Rendering Strategy
 * ──────────────────
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  SERVER (this file)                                                 │
 * │  1. Call getVehiclesWithDashboard() directly — hits Redis first,    │
 * │     falls back to Prisma if cache cold. No extra round-trip.        │
 * │  3. Serialize data into TanStack Query's dehydrated state.          │
 * │  4. Stream HTML to the browser — users see populated content        │
 * │     immediately, no loading spinner on first paint.                 │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │  CLIENT (VehicleContent.tsx)                                        │
 * │  5. HydrationBoundary rehydrates the dehydrated state into the      │
 * │     existing QueryClient — cache is warm on the first render.       │
 * │  6. useVehicleWithDashboard() finds the data in cache →             │
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
import { getVehiclesWithDashboard } from "@/app/lib/controllers/vehicle";
import { vehicleKeys } from "@/app/lib/query-keys/vehicle.keys";
import VehicleContent from "./components/VehicleContent";
import { logger } from "@/app/lib/logger";


export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return {
    title: dict.vehicles.title,
    description: dict.vehicles.subtitle,
  };
}

/* ────────────────────────────────────────────────────────────────────────────────
   Page metadata (optional — add per-page title/description here if needed)
──────────────────────────────────────────────────────────────────────────────── */
// Auth handled by proxy.ts middleware — no force-dynamic needed.

/* ─────────────────────────────────────────────────────────────────────────────
   SSR fallback skeleton shown while the server streams the component tree
───────────────────────────────────────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────────────────────────────────────
   Server Component — VehiclePage
───────────────────────────────────────────────────────────────────────────── */
export default async function VehiclePage() {
  /* ── 1. Create a fresh QueryClient for this request ───────────────── 
     Each SSR request gets its own QueryClient so there is NO shared state
     between concurrent requests (critical for multi-tenant correctness).
  ────────────────────────────────────────────────────────────────────────── */
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Data fetched on the server is considered fresh for 5 minutes.
        // The client won't refetch on mount unless the window is older than this.
        staleTime: 1000 * 60 * 5,
      },
    },
  });

  /* ── 3. Prefetch dashboard data (SSR) ──────────────────────────────────
     We call getVehiclesWithDashboard() directly here — it is a server action
     wrapped with authenticatedAction() which reads the session cookie via
     getAuthenticatedUser(). Since we already validated the user above we know
     this will succeed. The result is stored in the queryClient cache under the
     EXACT same key the client hook uses (vehicleKeys.dashboardWithFilters({})),
     ensuring the HydrationBoundary seamlessly rehydrates on the client.
  ──────────────────────────────────────────────────────────────────────── */
  try {
    await queryClient.prefetchQuery({
      // Must match the key used by useVehicleWithDashboard({})
      queryKey: vehicleKeys.dashboardWithFilters({}),
      queryFn: () => getVehiclesWithDashboard(),
      staleTime: 1000 * 60 * 5,
    });
  } catch (error) {
    // If prefetch fails (e.g. cold DB) the client will hydrate with no cache
    // and show the loading state gracefully — no hard crash.
    logger.error("[VehiclePage SSR] prefetch failed:", error);
  }

  /* ── 4. Serialize & stream to client ───────────────────────────────── */
  const dehydratedState = dehydrate(queryClient);

  return (
    <HydrationBoundary state={dehydratedState}>
      <Suspense fallback={<VehiclePageSkeleton />}>
        <VehicleContent />
      </Suspense>
    </HydrationBoundary>
  );
}
