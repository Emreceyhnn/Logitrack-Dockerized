/**
 * Company Page — Hybrid SSR + CSR
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
import { getCompanyWithDashboardData } from "@/app/lib/controllers/company";
import { companyKeys } from "@/app/lib/query-keys/company.keys";
import CompanyContent from "./components/CompanyContent";
import { logger } from "@/app/lib/logger";


export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return {
    title: dict.company.title,
    description: dict.company.subtitle,
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

export default async function CompanyPage() {

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
      },
    },
  });

  const filters = {
    page: 1,
    pageSize: 10,
    search: undefined,
  };

  try {
    await queryClient.prefetchQuery({
      queryKey: companyKeys.dashboardWithFilters(filters),
      queryFn: () => getCompanyWithDashboardData(filters),
      staleTime: 1000 * 60 * 5,
    });
  } catch (error) {
    logger.error("[CompanyPage SSR] prefetch failed:", error);
  }

  const dehydratedState = dehydrate(queryClient);

  return (
    <HydrationBoundary state={dehydratedState}>
      <Suspense fallback={<CompanyPageSkeleton />}>
        <CompanyContent />
      </Suspense>
    </HydrationBoundary>
  );
}
