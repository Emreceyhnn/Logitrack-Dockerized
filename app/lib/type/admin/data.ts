/**
 * ADMIN CONSOLE — DATA MANAGEMENT TYPES
 * =====================================
 * Client-safe types for the tenant, user, session and audit screens.
 *
 * PII NOTE: these surfaces are cross-tenant, so every row here has been
 * deliberately narrowed server-side. Password hashes, tokens, Google ids and
 * raw provider payloads are never selected, let alone serialised.
 */

// ─── Shared ─────────────────────────────────────────────────────────────────

/** Cursor-free pagination envelope. */
export interface Paginated<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type SortDirection = "asc" | "desc";

// ─── Tenants ────────────────────────────────────────────────────────────────

export interface AdminTenantRow {
  id: string;
  name: string;
  domain: string | null;
  userCount: number;
  vehicleCount: number;
  shipmentCount: number;
  createdAt: string;
}

// ─── Users ──────────────────────────────────────────────────────────────────

export type AdminUserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export interface AdminUserRow {
  id: string;
  email: string;
  name: string;
  surname: string;
  status: AdminUserStatus;
  roleName: string | null;
  companyId: string | null;
  companyName: string | null;
  emailVerified: boolean;
  provider: string;
  lastLoginAt: string | null;
  createdAt: string;
  activeSessionCount: number;
}

export interface AdminUserFilters {
  search: string;
  status: AdminUserStatus | "ALL";
  companyId: string | "ALL";
  page: number;
  pageSize: number;
}

// ─── Sessions ───────────────────────────────────────────────────────────────

export interface AdminSessionRow {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  deviceInfo: string | null;
  ipAddress: string | null;
  lastActivityAt: string;
  expiresAt: string;
  createdAt: string;
  isRevoked: boolean;
  /** True when unrevoked AND unexpired — the only sense in which it is live. */
  isActive: boolean;
}

// ─── Audit ──────────────────────────────────────────────────────────────────

export interface AdminAuditRow {
  id: string;
  action: string;
  userId: string | null;
  userEmail: string | null;
  ipAddress: string | null;
  deviceInfo: string | null;
  /** Serialised JSON metadata, pretty-printed for display. */
  metadata: string | null;
  createdAt: string;
}

export interface AdminAuditFilters {
  action: string | "ALL";
  search: string;
  page: number;
  pageSize: number;
}

// ─── Database viewer (READ-ONLY) ────────────────────────────────────────────

/**
 * Models exposed to the read-only browser. Deliberately a closed allowlist:
 * `User` is absent because its rows carry password hashes and OAuth ids, and
 * `Session`/`PasswordResetToken` are absent because their rows are bearer
 * credentials. Those have purpose-built screens instead.
 */
export type BrowsableModel =
  | "Company"
  | "Vehicle"
  | "Shipment"
  | "Route"
  | "Warehouse"
  | "Customer"
  | "Driver"
  | "Inventory";

export interface DbTableSnapshot {
  model: BrowsableModel;
  /** Column names present in the returned rows. */
  columns: string[];
  /** Row objects, already stringified per cell for safe display. */
  rows: Record<string, string>[];
  total: number;
  page: number;
  pageSize: number;
}

// ─── Feature flags ──────────────────────────────────────────────────────────

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  description: string;
  updatedAt: string | null;
}

// ─── Environment viewer ─────────────────────────────────────────────────────

export interface EnvEntry {
  key: string;
  /** Always masked for secrets; never the raw value. */
  value: string;
  /** True when the variable is set at all. */
  present: boolean;
  /** True when the value was masked rather than shown. */
  masked: boolean;
}

// ─── Page State / Actions ───────────────────────────────────────────────────

export interface AdminUsersState {
  data: Paginated<AdminUserRow> | null;
  filters: AdminUserFilters;
  loading: boolean;
  error: string | null;
  /** Id of the row currently running a mutation. */
  pendingId: string | null;
}

export interface AdminUsersActions {
  fetchUsers: (filters?: Partial<AdminUserFilters>) => Promise<void>;
  setFilter: <K extends keyof AdminUserFilters>(
    key: K,
    value: AdminUserFilters[K]
  ) => void;
  setStatus: (userId: string, status: AdminUserStatus) => Promise<void>;
  revokeUserSessions: (userId: string) => Promise<void>;
}

export interface AdminSessionsState {
  rows: AdminSessionRow[];
  loading: boolean;
  error: string | null;
  pendingId: string | null;
}

export interface AdminSessionsActions {
  fetchSessions: () => Promise<void>;
  revoke: (sessionId: string) => Promise<void>;
}

export interface AdminAuditState {
  data: Paginated<AdminAuditRow> | null;
  filters: AdminAuditFilters;
  loading: boolean;
  error: string | null;
}

export interface AdminAuditActions {
  fetchAudit: (filters?: Partial<AdminAuditFilters>) => Promise<void>;
  setFilter: <K extends keyof AdminAuditFilters>(
    key: K,
    value: AdminAuditFilters[K]
  ) => void;
}
