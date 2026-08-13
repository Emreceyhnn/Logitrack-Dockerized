import "server-only";

import { db } from "@/app/lib/db";
import { logger } from "@/app/lib/logger";
import { ValidationError, NotFoundError } from "@/app/lib/errors";
import { revokeSession, revokeAllUserSessions } from "@/app/lib/controllers/session/manage";
import type {
  AdminAuditFilters,
  AdminAuditRow,
  AdminSessionRow,
  AdminTenantRow,
  AdminUserFilters,
  AdminUserRow,
  AdminUserStatus,
  BrowsableModel,
  DbTableSnapshot,
  Paginated,
} from "@/app/lib/type/admin/data";

/**
 * PLATFORM DATA MANAGEMENT
 * ========================
 * Cross-tenant reads and a small set of guarded mutations for the admin
 * console. Callers must have passed `platformAdminAction`, which supplies the
 * `runAsSystem` context.
 *
 * Every `select` here is an explicit allowlist. Nothing does `select: *` or
 * returns a raw Prisma record, because these rows cross tenant boundaries and
 * the models carry credentials (User.password, Session.token).
 */

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 25;

/**
 * tr-Sayfa boyutunu güvenli aralığa sıkıştırır.
 * en-Clamps pagination inputs so a crafted request cannot ask for the whole
 *    table in one page.
 * input (page: number, pageSize: number)
 * output ({ skip: number; take: number; page: number; pageSize: number })
 */
function paginate(page: number, pageSize: number) {
  const safeSize = Math.min(
    Math.max(Math.trunc(pageSize) || DEFAULT_PAGE_SIZE, 1),
    MAX_PAGE_SIZE
  );
  const safePage = Math.max(Math.trunc(page) || 1, 1);
  return {
    skip: (safePage - 1) * safeSize,
    take: safeSize,
    page: safePage,
    pageSize: safeSize,
  };
}

// ─── Tenants ────────────────────────────────────────────────────────────────

/**
 * tr-Tüm kiracıları sayımlarıyla listeler.
 * en-Lists every tenant with its headline counts.
 * input ()
 * output (Promise<AdminTenantRow[]>)
 */
export async function listTenants(): Promise<AdminTenantRow[]> {
  const companies = await db.company.findMany({
    select: {
      id: true,
      name: true,
      domain: true,
      createdAt: true,
      _count: { select: { users: true, vehicles: true, shipments: true } },
    },
    orderBy: { createdAt: "desc" },
    take: MAX_PAGE_SIZE,
  });

  return companies.map((company) => ({
    id: company.id,
    name: company.name,
    domain: company.domain,
    userCount: company._count.users,
    vehicleCount: company._count.vehicles,
    shipmentCount: company._count.shipments,
    createdAt: company.createdAt.toISOString(),
  }));
}

// ─── Users ──────────────────────────────────────────────────────────────────

/**
 * tr-Kullanıcıları filtreleyip sayfalayarak listeler.
 * en-Lists users across all tenants, filtered and paginated.
 * input (filters: AdminUserFilters)
 * output (Promise<Paginated<AdminUserRow>>)
 */
export async function listUsers(
  filters: AdminUserFilters
): Promise<Paginated<AdminUserRow>> {
  const { skip, take, page, pageSize } = paginate(
    filters.page,
    filters.pageSize
  );

  const search = filters.search.trim();
  const where = {
    ...(filters.status !== "ALL" ? { status: filters.status } : {}),
    ...(filters.companyId !== "ALL" ? { companyId: filters.companyId } : {}),
    ...(search
      ? {
          OR: [
            { email: { contains: search, mode: "insensitive" as const } },
            { name: { contains: search, mode: "insensitive" as const } },
            { surname: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [total, users] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      // Explicit allowlist: `password` and `googleId` must never leave the DB.
      select: {
        id: true,
        email: true,
        name: true,
        surname: true,
        status: true,
        provider: true,
        emailVerifiedAt: true,
        lastLoginAt: true,
        createdAt: true,
        companyId: true,
        role: { select: { name: true } },
        company: { select: { name: true } },
        _count: { select: { sessions: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
  ]);

  return {
    rows: users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      surname: user.surname,
      status: user.status as AdminUserStatus,
      roleName: user.role?.name ?? null,
      companyId: user.companyId,
      companyName: user.company?.name ?? null,
      emailVerified: user.emailVerifiedAt !== null,
      provider: user.provider,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
      activeSessionCount: user._count.sessions,
    })),
    total,
    page,
    pageSize,
  };
}

/**
 * tr-Bir kullanıcının durumunu değiştirir.
 * en-Changes a user's account status. Suspending or deactivating also revokes
 *    every live session: leaving them valid would mean a suspended user keeps
 *    working until their access token expires, which defeats the action.
 * input (actingAdminId: string, userId: string, status: AdminUserStatus)
 * output (Promise<AdminUserStatus>)
 */
export async function setUserStatus(
  actingAdminId: string,
  userId: string,
  status: AdminUserStatus
): Promise<AdminUserStatus> {
  if (userId === actingAdminId) {
    // Self-lockout guard: an admin suspending themselves would immediately
    // lose the console and could not undo it.
    throw new ValidationError("You cannot change your own account status");
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) throw new NotFoundError("User");

  await db.user.update({ where: { id: userId }, data: { status } });

  if (status !== "ACTIVE") {
    await revokeAllUserSessions(userId);
  }

  logger.info(
    `[admin/data] status change: user=${userId} status=${status} by=${actingAdminId}`
  );

  return status;
}

/**
 * tr-Bir kullanıcının tüm oturumlarını kapatır.
 * en-Revokes every active session for a user.
 * input (userId: string)
 * output (Promise<void>)
 */
export async function revokeUserSessions(userId: string): Promise<void> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) throw new NotFoundError("User");

  await revokeAllUserSessions(userId);
}

// ─── Sessions ───────────────────────────────────────────────────────────────

/**
 * tr-Aktif oturumları listeler.
 * en-Lists sessions across all tenants, newest activity first.
 *    `token` and `refreshToken` are never selected — they are bearer
 *    credentials and would let anyone reading the response hijack the session.
 * input ()
 * output (Promise<AdminSessionRow[]>)
 */
export async function listSessions(): Promise<AdminSessionRow[]> {
  const now = new Date();

  const sessions = await db.session.findMany({
    select: {
      id: true,
      userId: true,
      deviceInfo: true,
      ipAddress: true,
      lastActivityAt: true,
      expiresAt: true,
      createdAt: true,
      isRevoked: true,
      user: { select: { email: true, name: true, surname: true } },
    },
    orderBy: { lastActivityAt: "desc" },
    take: MAX_PAGE_SIZE,
  });

  return sessions.map((session) => ({
    id: session.id,
    userId: session.userId,
    userEmail: session.user.email,
    userName: `${session.user.name} ${session.user.surname}`.trim(),
    deviceInfo: session.deviceInfo,
    ipAddress: session.ipAddress,
    lastActivityAt: session.lastActivityAt.toISOString(),
    expiresAt: session.expiresAt.toISOString(),
    createdAt: session.createdAt.toISOString(),
    isRevoked: session.isRevoked,
    isActive: !session.isRevoked && session.expiresAt > now,
  }));
}

/**
 * tr-Tek bir oturumu iptal eder.
 * en-Kills a single session, reusing the app's own revocation path so the
 *    Redis denylist stays in sync with the DB flag.
 * input (sessionId: string)
 * output (Promise<void>)
 */
export async function killSession(sessionId: string): Promise<void> {
  await revokeSession(sessionId);
}

// ─── Audit ──────────────────────────────────────────────────────────────────

/**
 * tr-Denetim kayıtlarını filtreleyerek listeler.
 * en-Lists audit records. The table is append-only by design — this console
 *    exposes no edit or delete path for it, because a mutable audit trail is
 *    worth nothing in an investigation.
 * input (filters: AdminAuditFilters)
 * output (Promise<Paginated<AdminAuditRow>>)
 */
export async function listAuditLogs(
  filters: AdminAuditFilters
): Promise<Paginated<AdminAuditRow>> {
  const { skip, take, page, pageSize } = paginate(
    filters.page,
    filters.pageSize
  );

  const search = filters.search.trim();
  const where = {
    ...(filters.action !== "ALL"
      ? { action: filters.action as never }
      : {}),
    ...(search
      ? {
          OR: [
            { ipAddress: { contains: search, mode: "insensitive" as const } },
            {
              user: {
                email: { contains: search, mode: "insensitive" as const },
              },
            },
          ],
        }
      : {}),
  };

  const [total, logs] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      select: {
        id: true,
        action: true,
        userId: true,
        ipAddress: true,
        deviceInfo: true,
        metadata: true,
        createdAt: true,
        user: { select: { email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
  ]);

  return {
    rows: logs.map((log) => ({
      id: log.id,
      action: log.action,
      userId: log.userId,
      userEmail: log.user?.email ?? null,
      ipAddress: log.ipAddress,
      deviceInfo: log.deviceInfo,
      metadata:
        log.metadata === null || log.metadata === undefined
          ? null
          : JSON.stringify(log.metadata, null, 2),
      createdAt: log.createdAt.toISOString(),
    })),
    total,
    page,
    pageSize,
  };
}

// ─── Database viewer (READ-ONLY) ────────────────────────────────────────────

/**
 * Closed allowlist of browsable models and the columns exposed for each.
 *
 * This is a whitelist, never a passthrough: `User`, `Session` and the token
 * tables are absent because their rows carry credentials. Adding a model here
 * is a deliberate act, and the column list must be reviewed with it.
 */
const BROWSABLE: Record<
  BrowsableModel,
  { columns: string[]; orderBy: string }
> = {
  Company: {
    columns: ["id", "name", "domain", "createdAt"],
    orderBy: "createdAt",
  },
  Vehicle: {
    columns: ["id", "fleetNo", "plate", "status", "companyId", "createdAt"],
    orderBy: "createdAt",
  },
  Shipment: {
    // trackingId is an opaque PUBLIC tracking token by design (see the schema
    // comment on the field), so surfacing it here leaks nothing.
    columns: ["id", "trackingId", "status", "companyId", "createdAt"],
    orderBy: "createdAt",
  },
  Route: {
    columns: ["id", "name", "status", "companyId", "createdAt"],
    orderBy: "createdAt",
  },
  Warehouse: {
    columns: ["id", "name", "type", "companyId", "createdAt"],
    orderBy: "createdAt",
  },
  Customer: {
    columns: ["id", "name", "email", "companyId", "createdAt"],
    orderBy: "createdAt",
  },
  Driver: {
    columns: ["id", "status", "companyId", "createdAt"],
    orderBy: "createdAt",
  },
  Inventory: {
    columns: ["id", "sku", "name", "quantity", "companyId", "createdAt"],
    orderBy: "createdAt",
  },
};

/** Prisma delegates for the browsable models, keyed by model name. */
const MODEL_DELEGATES: Record<
  BrowsableModel,
  {
    findMany: (args: unknown) => Promise<unknown[]>;
    count: (args?: unknown) => Promise<number>;
  }
> = {
  Company: db.company,
  Vehicle: db.vehicle,
  Shipment: db.shipment,
  Route: db.route,
  Warehouse: db.warehouse,
  Customer: db.customer,
  Driver: db.driver,
  Inventory: db.inventory,
} as never;

/**
 * tr-Hücre değerini görüntülenebilir metne çevirir.
 * en-Renders a cell value as display text. Dates become ISO strings and
 *    objects are JSON-encoded, so the client never has to interpret raw
 *    Prisma types.
 * input (value: unknown)
 * output (string)
 */
function renderCell(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/**
 * tr-Salt okunur tablo görüntüleyici.
 * en-Read-only table browser. There is no write path here by design: the
 *    console can inspect data across tenants but never edit it, so a mistake
 *    (or a stolen admin session) cannot corrupt customer records.
 * input (model: BrowsableModel, page: number, pageSize: number)
 * output (Promise<DbTableSnapshot>)
 */
export async function browseTable(
  model: BrowsableModel,
  page: number,
  pageSize: number
): Promise<DbTableSnapshot> {
  const config = BROWSABLE[model];
  if (!config) {
    throw new ValidationError(`Model "${model}" is not browsable`);
  }

  const delegate = MODEL_DELEGATES[model];
  const { skip, take, page: safePage, pageSize: safeSize } = paginate(
    page,
    pageSize
  );

  // `select` is built from the reviewed column list, so a schema change cannot
  // silently start exposing a new sensitive column.
  const select = Object.fromEntries(
    config.columns.map((column) => [column, true])
  );

  const [total, rows] = await Promise.all([
    delegate.count(),
    delegate.findMany({
      select,
      orderBy: { [config.orderBy]: "desc" },
      skip,
      take,
    }),
  ]);

  return {
    model,
    columns: config.columns,
    rows: (rows as Record<string, unknown>[]).map((row) =>
      Object.fromEntries(
        config.columns.map((column) => [column, renderCell(row[column])])
      )
    ),
    total,
    page: safePage,
    pageSize: safeSize,
  };
}

/** Model names the browser offers, for the client-side picker. */
export const BROWSABLE_MODELS = Object.keys(BROWSABLE) as BrowsableModel[];
