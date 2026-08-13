/**
 * Overview Page — Hybrid SSR + CSR
 */

import type { Metadata } from "next";
import { getDictionary } from "@/app/lib/language/language";
import { Suspense } from "react";
import { Box, Divider, Skeleton, Stack } from "@mui/material";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { getOverviewDashboardData } from "@/app/lib/controllers/overview";
import { overviewKeys } from "@/app/lib/query-keys/overview.keys";
import OverviewContent from "./components/OverviewContent";
import { logger } from "@/app/lib/logger";


export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return {
    title: dict.overview.title,
  };
}

// Layout-preserving fallback: mirrors the real page shape (header, KPI row,
// content grid) so the transition to <OverviewContent /> doesn't shift the
// layout (CLS). A bare centered spinner used to collapse the page height and
// then jump when content arrived.
function OverviewPageSkeleton() {
  return (
    <Box p={4} width="100%">
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={1}
      >
        <Skeleton variant="text" width={180} height={36} />
        <Skeleton variant="circular" width={32} height={32} />
      </Stack>
      <Divider sx={{ mb: 3 }} />

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            md: "repeat(4, 1fr)",
          },
          gap: 3,
        }}
      >
        {Array.from(new Array(8)).map((_, i) => (
          <Skeleton
            key={i}
            variant="rounded"
            height={160}
            sx={{ borderRadius: "28px" }}
          />
        ))}
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "repeat(12, 1fr)" },
          gap: 3,
          mt: 3,
        }}
      >
        <Skeleton
          variant="rounded"
          height={320}
          sx={{ borderRadius: 2, gridColumn: { xs: "1", lg: "span 6" } }}
        />
        <Skeleton
          variant="rounded"
          height={320}
          sx={{ borderRadius: 2, gridColumn: { xs: "1", lg: "span 6" } }}
        />
      </Box>
    </Box>
  );
}

export default async function OverviewPage() {

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
      },
    },
  });

  try {
    await queryClient.prefetchQuery({
      queryKey: overviewKeys.dashboard(),
      queryFn: () => getOverviewDashboardData(),
      staleTime: 1000 * 60 * 5,
    });
  } catch (error) {
    logger.error("[OverviewPage SSR] prefetch failed:", error);
  }

  const dehydratedState = dehydrate(queryClient);

  return (
    <HydrationBoundary state={dehydratedState}>
      <Suspense fallback={<OverviewPageSkeleton />}>
        <OverviewContent />
      </Suspense>
    </HydrationBoundary>
  );
}
