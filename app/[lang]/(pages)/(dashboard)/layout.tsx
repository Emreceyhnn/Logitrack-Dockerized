import DashboardLayoutClient from "@/app/components/dashboard/DashboardLayoutClient";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/app/lib/auth-middleware";
import { isWarehouseOnlyRole, isDriverOnlyRole, hasNoDashboardAccess } from "@/app/lib/roles";
import { UserProvider } from "@/app/lib/context/UserContext";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function DashboardLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}>) {
  const { lang } = await params;

  // Warehouse-only staff are confined to their own panel and must never reach
  // the main dashboard.
  const user = await getAuthenticatedUser();
  if (!user) {
    redirect(`/${lang}/auth/sign-in`);
  }
  if (user && isWarehouseOnlyRole(user.roleName)) {
    redirect(`/${lang}/warehouse-worker`);
  }
  // Drivers are confined to their own console and must never reach the main
  // dashboard.
  if (user && isDriverOnlyRole(user.roleName)) {
    redirect(`/${lang}/driver-console`);
  }
  // Default-role (Staff) users have no dashboard access whatsoever and are
  // confined to the landing page.
  if (user && hasNoDashboardAccess(user.roleName)) {
    redirect(`/${lang}?landing=true`);
  }

  // UserProvider lives here (not in the root [lang] layout) so the session
  // read only makes the dashboard tree dynamic — marketing pages stay static.
  return (
    <UserProvider initialUser={user}>
      <DashboardLayoutClient>{children}</DashboardLayoutClient>
    </UserProvider>
  );
}
