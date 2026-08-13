/**
 * ADMIN CONSOLE — SHELL TYPES
 * ===========================
 * Client-safe types for the platform-admin console shell (sidebar, header,
 * command palette, breadcrumbs).
 *
 * Import rule (see ../enums.ts): UI and hooks must never import from
 * "@prisma/client", so everything here is plain TypeScript.
 */

import type { ReactNode } from "react";

// ─── Domain Models ──────────────────────────────────────────────────────────

/** Health of a single dependency in the Health Check Matrix. */
export type ServiceStatus = "up" | "degraded" | "down" | "unknown";

/** Dependencies the console can probe. Kept as a union so a typo in a probe
 *  name is a compile error rather than a silently missing tile. */
export type ServiceKey =
  | "database"
  | "redis"
  | "email"
  | "storage"
  | "firebase"
  | "valhalla";

export interface ServiceHealth {
  key: ServiceKey;
  /** Human label, already localized by the caller. */
  label: string;
  status: ServiceStatus;
  /** Round-trip latency in ms; null when the probe did not complete. */
  latencyMs: number | null;
  /** Short diagnostic. Must never contain secrets or connection strings. */
  detail: string | null;
  checkedAt: string;
}

/** A navigation entry in the admin sidebar. */
export interface AdminNavItem {
  /** Stable id, also used as the command-palette search key. */
  id: string;
  /** Localized label. */
  label: string;
  /** Path relative to the locale root, e.g. "/admin/tenants". */
  href: string;
  /** Lucide icon name, resolved by the sidebar at render time. */
  icon: string;
  /** Nested entries (e.g. the sandbox group). */
  children?: AdminNavItem[];
  /** Marks destructive or high-risk surfaces so the UI can flag them. */
  sensitive?: boolean;
}

export interface AdminBreadcrumb {
  label: string;
  href?: string;
}

/** An entry in the Cmd+K palette. */
export interface CommandItem {
  id: string;
  label: string;
  /** Grouping header in the palette. */
  group: string;
  icon?: string;
  /** Navigation target; mutually exclusive with `run`. */
  href?: string;
  /** Imperative command; mutually exclusive with `href`. */
  run?: () => void | Promise<void>;
  /** Extra terms that should match this item in search. */
  keywords?: string[];
}

// ─── Page State ─────────────────────────────────────────────────────────────

export interface AdminShellState {
  sidebarCollapsed: boolean;
  commandPaletteOpen: boolean;
  /** Live health, polled by the shell so the sidebar can show a global dot. */
  services: ServiceHealth[];
  servicesLoading: boolean;
  error: string | null;
}

// ─── Page Actions ───────────────────────────────────────────────────────────

export interface AdminShellActions {
  toggleSidebar: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  refreshServices: () => Promise<void>;
}

// ─── Component Props ────────────────────────────────────────────────────────

export interface AdminShellProps {
  children: ReactNode;
  /** Localized nav tree, built server-side from the dictionary. */
  nav: AdminNavItem[];
  /** Display name of the signed-in platform admin. */
  adminName: string;
  adminEmail: string | null;
  avatarUrl: string | null;
  locale: string;
}

export interface AdminSidebarProps {
  nav: AdminNavItem[];
  collapsed: boolean;
  onToggle: () => void;
  /** Current pathname, used to highlight the active entry. */
  pathname: string;
  locale: string;
}

export interface AdminHeaderProps {
  adminName: string;
  adminEmail: string | null;
  avatarUrl: string | null;
  breadcrumbs: AdminBreadcrumb[];
  onOpenCommandPalette: () => void;
  services: ServiceHealth[];
  servicesLoading: boolean;
}

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  items: CommandItem[];
}

export interface StatusBadgeProps {
  status: ServiceStatus;
  label?: string;
  /** Renders a compact dot instead of a full pill. */
  dense?: boolean;
}
