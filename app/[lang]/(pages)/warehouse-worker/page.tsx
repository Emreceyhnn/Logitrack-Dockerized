import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { getAuthenticatedUser } from "@/app/lib/auth-middleware";
import { isWarehouseOnlyRole, hasNoDashboardAccess } from "@/app/lib/roles";
import { getWarehouseWorkerDashboard } from "@/app/lib/controllers/warehouseWorker";
import { warehouseWorkerKeys } from "@/app/lib/query-keys/warehouseWorker.keys";
import { GuidedTourProvider } from "@/app/lib/context/GuidedTourContext";
import { UserProvider } from "@/app/lib/context/UserContext";
import WarehouseWorkerClient from "./WarehouseWorkerClient";
import { logger } from "@/app/lib/logger";


export const metadata: Metadata = {
  title: "Warehouse Worker Dashboard | LogiTrack",
  description:
    "Operational dashboard for warehouse workers and site managers — scan & log stock movements, track picks/packs, monitor site capacity and live activity.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function WarehouseWorkerPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  const user = await getAuthenticatedUser();
  if (!user) {
    redirect(`/${lang}/auth/sign-in`);
  }
  if (user && hasNoDashboardAccess(user.roleName)) {
    redirect(`/${lang}?landing=true`);
  }

  const locked = isWarehouseOnlyRole(user.roleName);

  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 1000 * 30 } },
  });

  try {
    await queryClient.prefetchQuery({
      queryKey: warehouseWorkerKeys.dashboard(),
      queryFn: () => getWarehouseWorkerDashboard(),
    });
  } catch (error) {
    logger.error("[WarehouseWorkerPage SSR] prefetch failed:", error);
  }

  const dehydratedState = dehydrate(queryClient);

  return (
    <HydrationBoundary state={dehydratedState}>
      <Suspense fallback={null}>
        <UserProvider initialUser={user}>
          <GuidedTourProvider>
            <WarehouseWorkerClient locked={locked} lang={lang} />
          </GuidedTourProvider>
        </UserProvider>
      </Suspense>
    </HydrationBoundary>
  );
}
