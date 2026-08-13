import type { AuthenticatedUser } from "@/app/lib/auth-middleware";

/**
 * Fabricated authenticated user for the public, no-login Live Demo dashboard.
 * Never persisted, never derived from a real session — purely a client-side
 * / SSR-time constant so the real dashboard shell (SideBar, DashboardHeader,
 * page content) can render "as if" a real account were logged in.
 *
 * roleName "Administrator" is intentional: it is NOT in the warehouse-only
 * role set (see app/lib/roles.ts / roles.json role_admin), so nothing in the
 * demo tree could ever accidentally redirect it to /warehouse-worker.
 */
export function getDemoUser(lang: string): AuthenticatedUser {
  return {
    id: "demo-user",
    companyId: "demo-company",
    roleId: "role_admin",
    roleName: "Administrator",
    sessionId: "demo-session",
    name: "Demo",
    surname: "Account",
    avatarUrl: null,
    timezone: "Europe/Istanbul",
    dateFormat: "DD/MM/YYYY",
    timeFormat: "24h",
    currency: "USD",
    language: lang || "en",
    notifEmailShipment: true,
    notifEmailMaint: true,
    notifEmailWeekly: true,
    notifEmailAssignment: true,
    notifEmailDelay: true,
    notifPushAssignment: true,
    notifPushDelay: true,
    accessStatus: "ACTIVE",
    trialEndsAt: null,
    // The demo account is never gated on verification — it has no real inbox
    // to confirm, and the demo tree never sends mail.
    emailVerified: true,
  };
}
