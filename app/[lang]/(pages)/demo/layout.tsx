import { Metadata } from "next";
import DemoDashboardLayoutClient from "@/app/components/dashboard/DemoDashboardLayoutClient";
import { UserProvider } from "@/app/lib/context/UserContext";
import { getDemoUser } from "@/app/lib/mocks/demoUser";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function DemoLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}>) {
  const { lang } = await params;

  // Public, no-login Live Demo dashboard: no getAuthenticatedUser() call, no
  // redirect logic — /demo/* is deliberately outside PROTECTED_ROUTES /
  // COMPANY_REQUIRED_ROUTES in app/lib/constants.ts, so proxy.ts never
  // touches it. The user is a fabricated constant, never a real session.
  const demoUser = getDemoUser(lang);

  return (
    <UserProvider initialUser={demoUser}>
      <DemoDashboardLayoutClient>{children}</DemoDashboardLayoutClient>
    </UserProvider>
  );
}
