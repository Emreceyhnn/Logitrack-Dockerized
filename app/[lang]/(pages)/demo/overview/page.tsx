/**
 * Live Demo — Overview Page
 *
 * Mirrors the real overview/page.tsx SSR-prefetch skeleton, but prefetches
 * the fixed mock dataset (no auth, no DB) into the SAME query key the demo
 * hook (useDemoOverview) uses, so HydrationBoundary rehydrates seamlessly.
 */

import type { Metadata } from "next";
import { Suspense } from "react";
import { Box, Divider, Skeleton, Stack } from "@mui/material";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { getOverviewMock } from "@/app/lib/mocks/overviewMock";
import DemoOverviewContent from "./components/DemoOverviewContent";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Live Demo — Overview | LogiTrack",
    robots: { index: false, follow: false },
  };
}

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

export default async function DemoOverviewPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
      },
    },
  });

  await queryClient.prefetchQuery({
    queryKey: ["demo", "overview", "dashboard"],
    queryFn: () => Promise.resolve(getOverviewMock()),
    staleTime: 1000 * 60 * 5,
  });

  const dehydratedState = dehydrate(queryClient);

  return (
    <HydrationBoundary state={dehydratedState}>
      <Suspense fallback={<OverviewPageSkeleton />}>
        <DemoOverviewContent />
      </Suspense>
    </HydrationBoundary>
  );
}
