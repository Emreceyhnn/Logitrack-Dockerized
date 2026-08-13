/**
 * Live Demo — Warehouse Worker Panel
 *
 * Standalone full-screen operational panel (bypasses the demo dashboard shell
 * via the pathname check in DemoDashboardLayoutClient). Prefetches the fixed
 * mock dataset into the same query key the demo hook uses; no auth, no DB.
 */

import type { Metadata } from "next";
import { Suspense } from "react";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { getWarehouseWorkerDashboardMock } from "@/app/lib/mocks/warehouseWorkerMock";
import DemoWarehouseWorkerClient from "./components/DemoWarehouseWorkerClient";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Live Demo — Warehouse Panel | LogiTrack",
    description:
      "Explore the LogiTrack warehouse worker panel with sample data.",
    robots: { index: false, follow: false },
  };
}

export default async function DemoWarehouseWorkerPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 1000 * 30 } },
  });

  await queryClient.prefetchQuery({
    queryKey: ["demo", "warehouse-worker", "dashboard", "default"],
    queryFn: () => Promise.resolve(getWarehouseWorkerDashboardMock()),
  });

  const dehydratedState = dehydrate(queryClient);

  return (
    <HydrationBoundary state={dehydratedState}>
      <Suspense fallback={null}>
        <DemoWarehouseWorkerClient lang={lang} />
      </Suspense>
    </HydrationBoundary>
  );
}
