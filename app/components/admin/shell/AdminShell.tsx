"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Box, useTheme } from "@mui/material";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
import CommandPalette from "./CommandPalette";
import {
  buildAdminBreadcrumbs,
  flattenAdminNav,
} from "@/app/lib/admin/nav";
import { useDictionary } from "@/app/lib/language/DictionaryContext";
import type {
  AdminShellProps,
  AdminShellState,
  AdminShellActions,
  CommandItem,
  ServiceHealth,
} from "@/app/lib/type/admin/shell";

const SIDEBAR_STORAGE_KEY = "logitrack-admin-sidebar-collapsed";
const HEALTH_POLL_MS = 60_000;

/**
 * tr-Yönetim konsolu kabuğu: tek kök state ve action nesnesini sahiplenir.
 * en-Admin console shell. Owns the single root `AdminShellState` and exposes
 *    every mutation through `AdminShellActions`, per the project's page
 *    architecture: children receive state + actions as props and never mutate
 *    state directly.
 * input (AdminShellProps)
 * output (JSX.Element)
 */
export default function AdminShell({
  children,
  nav,
  adminName,
  adminEmail,
  avatarUrl,
  locale,
}: AdminShellProps) {
  const theme = useTheme();
  const dict = useDictionary();
  const pathname = usePathname();

  // ─── Single root state ────────────────────────────────────────────────────
  const [state, setState] = useState<AdminShellState>({
    sidebarCollapsed: false,
    commandPaletteOpen: false,
    services: [],
    servicesLoading: true,
    error: null,
  });

  // Restore the collapse preference after mount. Reading localStorage during
  // the initial render would desync server and client HTML.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (stored === "true") {
        setState((s) => ({ ...s, sidebarCollapsed: true }));
      }
    } catch {
      // localStorage unavailable (private browsing) — keep the default.
    }
  }, []);

  // ─── Actions ──────────────────────────────────────────────────────────────
  const toggleSidebar = useCallback(() => {
    setState((s) => {
      const next = !s.sidebarCollapsed;
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
      } catch {
        // Preference is cosmetic; ignore persistence failures.
      }
      return { ...s, sidebarCollapsed: next };
    });
  }, []);

  const setCommandPaletteOpen = useCallback((open: boolean) => {
    setState((s) => ({ ...s, commandPaletteOpen: open }));
  }, []);

  const refreshServices = useCallback(async () => {
    setState((s) => ({ ...s, servicesLoading: true, error: null }));
    try {
      const res = await fetch("/api/admin/health", {
        cache: "no-store",
        headers: { accept: "application/json" },
      });
      if (!res.ok) {
        throw new Error(`Health check failed with status ${res.status}`);
      }
      const data = (await res.json()) as { services?: ServiceHealth[] };
      setState((s) => ({
        ...s,
        services: data.services ?? [],
        servicesLoading: false,
      }));
    } catch (err) {
      // A failed probe must not blank the header — keep the last known
      // statuses and surface the error instead.
      setState((s) => ({
        ...s,
        servicesLoading: false,
        error: err instanceof Error ? err.message : dict.admin.common.error,
      }));
    }
  }, [dict.admin.common.error]);

  const actions = useMemo<AdminShellActions>(
    () => ({ toggleSidebar, setCommandPaletteOpen, refreshServices }),
    [toggleSidebar, setCommandPaletteOpen, refreshServices]
  );

  // Poll health so the header indicator stays live without a manual refresh.
  useEffect(() => {
    void refreshServices();
    const id = setInterval(() => void refreshServices(), HEALTH_POLL_MS);
    return () => clearInterval(id);
  }, [refreshServices]);

  // ─── Global Cmd/Ctrl + K ──────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setState((s) => ({ ...s, commandPaletteOpen: !s.commandPaletteOpen }));
      }
      if (event.key === "Escape") {
        setState((s) =>
          s.commandPaletteOpen ? { ...s, commandPaletteOpen: false } : s
        );
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // ─── Derived data ─────────────────────────────────────────────────────────
  const breadcrumbs = useMemo(
    () => buildAdminBreadcrumbs(pathname, nav, dict),
    [pathname, nav, dict]
  );

  const commandItems = useMemo<CommandItem[]>(() => {
    const navItems: CommandItem[] = flattenAdminNav(nav).map((item) => ({
      id: `nav-${item.id}`,
      label: item.label,
      group: dict.admin.palette.groupNavigation,
      href: `/${locale}${item.href}`,
      keywords: [item.id, item.href],
    }));

    const actionItems: CommandItem[] = [
      {
        id: "action-refresh-health",
        label: dict.admin.common.refresh,
        group: dict.admin.palette.groupActions,
        run: refreshServices,
        keywords: ["health", "refresh", "yenile", "sağlık"],
      },
      {
        id: "action-toggle-sidebar",
        label: dict.admin.nav.overview,
        group: dict.admin.palette.groupActions,
        run: toggleSidebar,
        keywords: ["sidebar", "collapse", "menü"],
      },
    ];

    return [...navItems, ...actionItems];
  }, [nav, locale, dict, refreshServices, toggleSidebar]);

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        backgroundColor: theme.palette.background.dashboardBg,
      }}
    >
      <Box
        component="nav"
        sx={{ display: { xs: "none", md: "block" }, flexShrink: 0 }}
      >
        <AdminSidebar
          nav={nav}
          collapsed={state.sidebarCollapsed}
          onToggle={actions.toggleSidebar}
          pathname={pathname}
          locale={locale}
        />
      </Box>

      <Box
        sx={{
          flexGrow: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <AdminHeader
          adminName={adminName}
          adminEmail={adminEmail}
          avatarUrl={avatarUrl}
          breadcrumbs={breadcrumbs}
          onOpenCommandPalette={() => actions.setCommandPaletteOpen(true)}
          services={state.services}
          servicesLoading={state.servicesLoading}
        />

        <Box
          component="main"
          id="admin-main-content"
          sx={{ flexGrow: 1, p: { xs: 2, md: 3 }, minWidth: 0 }}
        >
          {children}
        </Box>
      </Box>

      <CommandPalette
        open={state.commandPaletteOpen}
        onClose={() => actions.setCommandPaletteOpen(false)}
        items={commandItems}
      />
    </Box>
  );
}
