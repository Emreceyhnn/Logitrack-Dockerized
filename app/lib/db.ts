import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { getTenantCompanyId, isSystemContext } from "./tenant-context";

const TENANT_MODELS = new Set<string>([
  "Driver",
  "Vehicle",
  "MaintenanceRecord",
  "Warehouse",
  "WarehouseZone",
  "WarehouseTask",
  "Customer",
  "CustomerLocation",
  "Inventory",
  "InventoryMovement",
  "Shipment",
  "ShipmentHistory",
  "ShipmentStop",
  "ShipmentItem",
  "Route",
  "RouteStop",
  "Document",
  "FuelLog",
  "Issue",
  "Trailer",
  "TrailerAssignment",
]);

/**
 * Models with a `deletedAt` column: reads hide soft-deleted rows by default.
 *
 * Adding a model here makes soft-deleted rows disappear from EVERY read across
 * the app — dashboards, lists, counts and relations — without each call site
 * remembering to filter. That is the point: a "deleted" record that still shows
 * up in one forgotten query is worse than no delete feature at all.
 *
 * A caller that genuinely needs deleted rows (the admin console's restore view)
 * must pass `deletedAt` explicitly in its `where`, which suppresses the
 * injection below.
 */
const SOFT_DELETE_MODELS = new Set<string>([
  "Vehicle",
  "Trailer",
  "User",
  "Company",
  "Shipment",
  "Route",
  "Warehouse",
  "Customer",
  "Driver",
  "Inventory",
]);

const READ_OPS = new Set<string>([
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "findUnique",
  "findUniqueOrThrow",
  "count",
  "aggregate",
  "groupBy",
]);

const WHERE_OPS = new Set<string>([
  ...READ_OPS,
  "update",
  "updateMany",
  "delete",
  "deleteMany",
  "upsert",
]);

/** Operations that carry a data payload we can inspect for an explicit companyId. */
const CREATE_OPS = new Set<string>([
  "create",
  "createMany",
  "createManyAndReturn",
  "upsert",
]);

/**
 tr-
 * en-
 * input (
  model: string,
  operation: string,
  args: unknown
)
 * output (void)
 */
function assertExplicitlyScoped(
  model: string,
  operation: string,
  args: unknown
): void {
  const a = (args ?? {}) as {
    where?: { companyId?: unknown };
    data?: unknown;
    create?: { companyId?: unknown };
  };

  const hasScopedId = (value: unknown): boolean => typeof value === "string";

  if (WHERE_OPS.has(operation)) {
    if (!hasScopedId(a.where?.companyId)) {
      throw new Error(
        `Tenant guard: ${operation} on ${model} without tenant context and without an explicit where.companyId`
      );
    }
  }

  if (CREATE_OPS.has(operation)) {
    const rows =
      operation === "upsert"
        ? [a.create]
        : Array.isArray(a.data)
          ? (a.data as { companyId?: unknown }[])
          : a.data !== undefined
            ? [a.data as { companyId?: unknown }]
            : [];

    if (rows.length === 0 && operation !== "upsert") {
      throw new Error(
        `Tenant guard: ${operation} on ${model} without tenant context and without payload data`
      );
    }

    for (const row of rows) {
      if (!hasScopedId(row?.companyId)) {
        throw new Error(
          `Tenant guard: ${operation} on ${model} without tenant context and without an explicit companyId`
        );
      }
    }
  }
}

/**
 * tr-Prisma istemcisini oluşturur.
 * en-Creates a Prisma client.
 * input (void)
 * output (PrismaClient)
 */
function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (
    !connectionString &&
    process.env.NEXT_PHASE !== "phase-production-build"
  ) {
    throw new Error(
      "DATABASE_URL is not set — cannot initialise the database pool"
    );
  }

  const pool = new Pool({ connectionString: connectionString! });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({ adapter }).$extends({
    name: "tenant-guard",
    query: {
      $allModels: {
        $allOperations({ model, operation, args, query }) {
          const companyId = getTenantCompanyId();
          const isTenantModel = TENANT_MODELS.has(model);
          const isSoftDelete = SOFT_DELETE_MODELS.has(model);

          // Fail closed: a tenant model touched without an ambient companyId is
          // only allowed when the caller has explicitly scoped it themselves —
          // an explicit `where: { companyId }` for reads/updates/deletes, or an
          // explicit `companyId` in the payload for creates. Otherwise the query
          // would run unscoped across every tenant, so we block it. This keeps
          // legitimate pre-tenant auth/bootstrap flows working (they always name
          // their companyId) while closing the unscoped-access hole.
          if (isTenantModel && !companyId && !isSystemContext()) {
            assertExplicitlyScoped(model, operation, args);
          }

          if ((isTenantModel || isSoftDelete) && WHERE_OPS.has(operation)) {
            const current = (args ?? {}) as {
              where?: Record<string, unknown>;
            };
            const extra: Record<string, unknown> = {};

            if (
              isTenantModel &&
              companyId &&
              current.where?.companyId === undefined
            ) {
              extra.companyId = companyId;
            }

            // Opt-out is by KEY PRESENCE, not by value: a caller that has
            // constrained `deletedAt` itself — directly, or inside a top-level
            // OR as `INCLUDE_DELETED` does — owns the filter, and injecting
            // `deletedAt: null` on top would silently override their intent.
            //
            // Testing `where.deletedAt !== undefined` instead would treat an
            // explicit `deletedAt: undefined` as "not provided" and re-apply
            // the filter, defeating the opt-out.
            const where = current.where;
            const constrainsDeletedAt =
              where !== undefined &&
              (Object.prototype.hasOwnProperty.call(where, "deletedAt") ||
                (Array.isArray(where.OR) &&
                  (where.OR as Record<string, unknown>[]).some(
                    (clause) =>
                      clause !== null &&
                      typeof clause === "object" &&
                      Object.prototype.hasOwnProperty.call(clause, "deletedAt")
                  )));

            if (isSoftDelete && READ_OPS.has(operation) && !constrainsDeletedAt) {
              extra.deletedAt = null;
            }

            if (Object.keys(extra).length > 0) {
              args = {
                ...current,
                where: { ...current.where, ...extra },
              } as typeof args;
            }
          }

          // Block cross-tenant writes and auto-inject companyId: a create inside
          // tenant context must target the caller's own company.
          if (
            isTenantModel &&
            companyId &&
            (operation === "create" || operation === "upsert")
          ) {
            // TypeScript trick to cast args so we can mutate the inner object safely
            type MutArgs = {
              data?: { companyId?: unknown };
              create?: { companyId?: unknown };
            };
            const mArgs = args as MutArgs;

            const data = operation === "create" ? mArgs.data : mArgs.create;

            if (data) {
              if (
                typeof data.companyId === "string" &&
                data.companyId !== companyId
              ) {
                throw new Error(
                  `Tenant guard: attempted to create ${model} for another company`
                );
              }
              // Auto-inject companyId if omitted
              if (data.companyId === undefined) {
                data.companyId = companyId;
              }
            } else {
              // If data/create object is completely missing but the operation was called
              if (operation === "create") {
                mArgs.data = { companyId };
              } else {
                mArgs.create = { companyId };
              }
            }
          }

          // Same protection for bulk creates: every row must belong to the
          // caller's company; rows without an explicit companyId get it injected.
          if (
            isTenantModel &&
            companyId &&
            (operation === "createMany" || operation === "createManyAndReturn")
          ) {
            const mArgs = args as { data?: unknown };
            const rows = Array.isArray(mArgs.data)
              ? (mArgs.data as { companyId?: unknown }[])
              : mArgs.data !== undefined
                ? [mArgs.data as { companyId?: unknown }]
                : [];
            for (const row of rows) {
              if (
                typeof row.companyId === "string" &&
                row.companyId !== companyId
              ) {
                throw new Error(
                  `Tenant guard: attempted to create ${model} for another company`
                );
              }
              if (row.companyId === undefined) {
                row.companyId = companyId;
              }
            }
          }

          // Block companyId reassignment on updates: a tenant row must never be
          // moved to another company (accepts both `companyId: "x"` and the
          // `companyId: { set: "x" }` update forms).
          if (
            isTenantModel &&
            companyId &&
            (operation === "update" ||
              operation === "updateMany" ||
              operation === "updateManyAndReturn" ||
              operation === "upsert")
          ) {
            const mArgs = args as {
              data?: { companyId?: unknown };
              update?: { companyId?: unknown };
            };
            const data = operation === "upsert" ? mArgs.update : mArgs.data;
            const target =
              typeof data?.companyId === "object" && data.companyId !== null
                ? (data.companyId as { set?: unknown }).set
                : data?.companyId;
            if (typeof target === "string" && target !== companyId) {
              throw new Error(
                `Tenant guard: attempted to move ${model} to another company`
              );
            }
          }

          return query(args);
        },
      },
    },
  });
}

export type Db = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: Db;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
