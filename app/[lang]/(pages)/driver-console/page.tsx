import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query";
import { getAuthenticatedUser } from "@/app/lib/auth-middleware";
import { isDriverOnlyRole, hasNoDashboardAccess } from "@/app/lib/roles";
import { getDriverConsoleDashboard } from "@/app/lib/controllers/driverConsole";
import { driverConsoleKeys } from "@/app/lib/query-keys/driverConsole.keys";
import { GuidedTourProvider } from "@/app/lib/context/GuidedTourContext";
import { UserProvider } from "@/app/lib/context/UserContext";
import DriverConsoleClient from "./DriverConsoleClient";
import { logger } from "@/app/lib/logger";

export const metadata: Metadata = {
  title: "Driver Console | LogiTrack",
  description:
    "Self-service dashboard for drivers — duty status, active route with AI-assisted routing, assigned shipments, vehicle & fuel, and documents.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function DriverConsolePage({
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

  const locked = isDriverOnlyRole(user.roleName);

  const queryClient = new QueryClient({
    defaultOptions: { queries: { staleTime: 1000 * 30 } },
  });

  try {
    await queryClient.prefetchQuery({
      queryKey: driverConsoleKeys.dashboard(),
      queryFn: () => getDriverConsoleDashboard(),
    });
  } catch (error) {
    logger.error("[DriverConsolePage SSR] prefetch failed:", error);
  }

  const dehydratedState = dehydrate(queryClient);

  return (
    <HydrationBoundary state={dehydratedState}>
      <Suspense fallback={null}>
        <UserProvider initialUser={user}>
          <GuidedTourProvider>
            <DriverConsoleClient locked={locked} lang={lang} />
          </GuidedTourProvider>
        </UserProvider>
      </Suspense>
    </HydrationBoundary>
  );
}
