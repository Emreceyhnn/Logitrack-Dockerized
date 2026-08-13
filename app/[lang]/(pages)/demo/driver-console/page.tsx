/**
 * Live Demo — Driver Console
 *
 * Standalone full-screen panel (bypasses the demo dashboard shell via the
 * pathname check in DemoDashboardLayoutClient). Prefetches the fixed mock
 * dataset into the same query key the demo hook uses; no auth, no DB.
 */

import type { Metadata } from "next";
import { Suspense } from "react";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { getDriverConsoleDashboardMock } from "@/app/lib/mocks/driverConsoleMock";
import DemoDriverConsoleClient from "./components/DemoDriverConsoleClient";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Live Demo — Driver Console | LogiTrack",
    description: "Explore the LogiTrack driver console with sample data.",
    robots: { index: false, follow: false },
  };
}

export default async function DemoDriverConsolePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 1000 * 30 } },
  });

  await queryClient.prefetchQuery({
    queryKey: ["demo", "driver-console", "dashboard"],
    queryFn: () => Promise.resolve(getDriverConsoleDashboardMock()),
  });

  const dehydratedState = dehydrate(queryClient);

  return (
    <HydrationBoundary state={dehydratedState}>
      <Suspense fallback={null}>
        <DemoDriverConsoleClient lang={lang} />
      </Suspense>
    </HydrationBoundary>
  );
}
