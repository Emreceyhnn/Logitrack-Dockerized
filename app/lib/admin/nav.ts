import type { Dictionary } from "@/app/lib/language/language";
import type { AdminNavItem, AdminBreadcrumb } from "@/app/lib/type/admin/shell";

/**
 * ADMIN CONSOLE NAVIGATION
 * ========================
 * Single source of truth for the console's routes. The sidebar, the command
 * palette and the breadcrumb trail are all derived from this tree, so adding a
 * page here wires it into all three at once.
 *
 * Paths are locale-relative ("/admin/tenants"); the locale prefix is applied at
 * render time. Admin routes are deliberately NOT registered in the localized
 * navigation map used by marketing/dashboard pages — the console keeps a single
 * canonical URL shape across locales so audit trails and shared links stay
 * stable.
 */

/**
 * tr-Yerelleştirilmiş yönetim konsolu gezinme ağacını oluşturur.
 * en-Builds the localized admin navigation tree.
 * input (dict: Dictionary)
 * output (AdminNavItem[])
 */
export function buildAdminNav(dict: Dictionary): AdminNavItem[] {
  const t = dict.admin.nav;

  return [
    {
      id: "overview",
      label: t.overview,
      href: "/admin",
      icon: "LayoutDashboard",
    },
    {
      id: "platform",
      label: t.platform,
      href: "",
      icon: "Building2",
      children: [
        {
          id: "tenants",
          label: t.tenants,
          href: "/admin/tenants",
          icon: "Building2",
        },
        {
          id: "users",
          label: t.users,
          href: "/admin/users",
          icon: "Users",
          // Hosts the masquerade action.
          sensitive: true,
        },
        {
          id: "sessions",
          label: t.sessions,
          href: "/admin/sessions",
          icon: "KeyRound",
        },
        {
          id: "demo-requests",
          label: t.demoRequests,
          href: "/admin/demo-requests",
          icon: "Rocket",
          // Approving grants real dashboard entitlement to an account.
          sensitive: true,
        },
        {
          id: "audit",
          label: t.audit,
          href: "/admin/audit",
          icon: "ScrollText",
        },
        {
          id: "deleted",
          label: t.deleted,
          href: "/admin/deleted",
          icon: "Trash2",
          // Restoring a record puts it back in front of real users.
          sensitive: true,
        },
      ],
    },
    {
      id: "observability",
      label: t.observability,
      href: "",
      icon: "Activity",
      children: [
        { id: "health", label: t.health, href: "/admin/health", icon: "HeartPulse" },
        // No "Live Logs" entry: app/lib/logger.ts only ever writes to
        // console.log/warn/error and persists nothing anywhere, so there is no
        // log store this console could actually read from. /admin/audit is the
        // real event trail (structured, persisted, queryable) and is what a
        // live-log page would have had to fall back to anyway.
        {
          id: "database",
          label: t.database,
          href: "/admin/database",
          icon: "Database",
          // Read-only, but still exposes cross-tenant records.
          sensitive: true,
        },
      ],
    },
    {
      id: "sandbox",
      label: t.sandbox,
      href: "",
      icon: "FlaskConical",
      children: [
        { id: "sandbox-api", label: t.sandboxApi, href: "/admin/sandbox/api", icon: "Send" },
        {
          id: "sandbox-websocket",
          label: t.sandboxWebsocket,
          href: "/admin/sandbox/websocket",
          icon: "Radio",
        },
        {
          id: "sandbox-email",
          label: t.sandboxEmail,
          href: "/admin/sandbox/email",
          icon: "Mail",
          // Sends real mail through Resend.
          sensitive: true,
        },
        {
          id: "sandbox-queue",
          label: t.sandboxQueue,
          href: "/admin/sandbox/queue",
          icon: "ListChecks",
        },
        // NOTE: a notifications/push tester is intentionally absent. This app
        // sends notifications by email (Resend) — already covered by the email
        // tester — and has no SMS or push provider to exercise.
      ],
    },
    {
      id: "system",
      label: t.system,
      href: "",
      icon: "Settings2",
      children: [
        { id: "flags", label: t.flags, href: "/admin/flags", icon: "ToggleLeft" },
        {
          id: "settings",
          label: t.settings,
          href: "/admin/settings",
          icon: "Lock",
          sensitive: true,
        },
      ],
    },
  ];
}

/**
 * tr-Gezinme ağacını düzleştirir; komut paleti ve breadcrumb için kullanılır.
 * en-Flattens the nav tree to its leaf (navigable) entries.
 * input (nav: AdminNavItem[])
 * output (AdminNavItem[])
 */
export function flattenAdminNav(nav: AdminNavItem[]): AdminNavItem[] {
  const out: AdminNavItem[] = [];
  for (const item of nav) {
    // Group headers carry an empty href and are not navigable themselves.
    if (item.href) out.push(item);
    if (item.children?.length) out.push(...flattenAdminNav(item.children));
  }
  return out;
}

/**
 * tr-Geçerli yola göre breadcrumb izini oluşturur.
 * en-Builds the breadcrumb trail for the current pathname.
 *    `pathname` may include the locale prefix; it is stripped before matching.
 * input (pathname: string, nav: AdminNavItem[], dict: Dictionary)
 * output (AdminBreadcrumb[])
 */
export function buildAdminBreadcrumbs(
  pathname: string,
  nav: AdminNavItem[],
  dict: Dictionary
): AdminBreadcrumb[] {
  const path = stripLocale(pathname);
  const root: AdminBreadcrumb = { label: dict.admin.title, href: "/admin" };

  if (path === "/admin" || path === "/admin/") return [root];

  for (const group of nav) {
    for (const child of group.children ?? []) {
      if (child.href === path) {
        // Group headers are not navigable, so they appear without an href.
        return [root, { label: group.label }, { label: child.label }];
      }
    }
    if (group.href && group.href !== "/admin" && group.href === path) {
      return [root, { label: group.label }];
    }
  }

  return [root];
}

/**
 * tr-Yol başındaki yerel ayar önekini kaldırır.
 * en-Strips a leading locale segment ("/en/admin" → "/admin").
 * input (pathname: string)
 * output (string)
 */
export function stripLocale(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] && segments[0].length === 2) {
    return "/" + segments.slice(1).join("/");
  }
  return "/" + segments.join("/");
}
