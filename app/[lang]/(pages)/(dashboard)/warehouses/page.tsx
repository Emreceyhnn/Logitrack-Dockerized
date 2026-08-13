/**
 * Warehouses Page — Hybrid SSR + CSR
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
import { getWarehousesWithDashboardData } from "@/app/lib/controllers/warehouse";
import { warehouseKeys } from "@/app/lib/query-keys/warehouse.keys";
import WarehouseContent from "./components/WarehouseContent";
import { logger } from "@/app/lib/logger";


export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return {
    title: dict.warehouses.title,
    description: dict.warehouses.subtitle,
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

export default async function WarehousePage() {

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

  try {
    await queryClient.prefetchQuery({
      queryKey: warehouseKeys.dashboardWithFilters(clientPage, pageSize),
      queryFn: () => getWarehousesWithDashboardData(serverPage, pageSize),
      staleTime: 1000 * 60 * 5,
    });
  } catch (error) {
    logger.error("[WarehousePage SSR] prefetch failed:", error);
  }

  const dehydratedState = dehydrate(queryClient);

  return (
    <HydrationBoundary state={dehydratedState}>
      <Suspense fallback={<WarehousePageSkeleton />}>
        <WarehouseContent />
      </Suspense>
    </HydrationBoundary>
  );
}
