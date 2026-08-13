import "server-only";

import { db } from "@/app/lib/db";
import { INCLUDE_DELETED } from "@/app/lib/softDelete";
import { logger } from "@/app/lib/logger";
import { ValidationError, NotFoundError, ConflictError } from "@/app/lib/errors";
import { revokeAllUserSessions } from "@/app/lib/controllers/session/manage";
import { isPlatformAdmin } from "@/app/lib/platform-admin";
import type { AuthenticatedUser } from "@/app/lib/auth-middleware";

/**
 * SOFT DELETE / RESTORE
 * =====================
 * Delete actions for the admin console. Callers must have passed
 * `platformAdminAction`.
 *
 * WHY SOFT DELETE
 * Nearly every foreign key in this schema is `onDelete: Restrict`, so a real
 * DELETE of a company or user is rejected by Postgres the moment any dependent
 * row exists — and `audit_logs.userId` is Restrict too, so hard-deleting a user
 * would either fail outright or destroy its own audit trail. Stamping
 * `deletedAt` keeps referential integrity, preserves the audit record, and is
 * reversible. The tenant-guard extension in db.ts then hides the row from every
 * read across the app.
 */

/** Entities the console can delete. */
export type DeletableEntity =
  | "user"
  | "company"
  | "vehicle"
  | "trailer"
  | "shipment"
  | "route"
  | "warehouse"
  | "customer"
  | "driver"
  | "inventory";

export interface DeletionResult {
  entity: DeletableEntity;
  id: string;
  deletedAt: string | null;
  /** Human-readable label of the affected record, for the audit trail. */
  label: string;
  /** Related records hidden as a consequence, when the entity is a company. */
  cascadeSummary?: Record<string, number>;
}

/** Prisma delegates for the deletable entities. */
type SoftDeleteDelegate = {
  findFirst: (args: unknown) => Promise<Record<string, unknown> | null>;
  update: (args: unknown) => Promise<unknown>;
};

const DELEGATES: Record<DeletableEntity, SoftDeleteDelegate> = {
  user: db.user,
  company: db.company,
  vehicle: db.vehicle,
  trailer: db.trailer,
  shipment: db.shipment,
  route: db.route,
  warehouse: db.warehouse,
  customer: db.customer,
  driver: db.driver,
  inventory: db.inventory,
} as never;

/** Fields used to build a readable label per entity, in priority order. */
const LABEL_FIELDS: Record<DeletableEntity, string[]> = {
  user: ["email"],
  company: ["name"],
  vehicle: ["plate", "fleetNo"],
  trailer: ["plate"],
  shipment: ["trackingId"],
  route: ["name"],
  warehouse: ["name", "code"],
  customer: ["name", "code"],
  driver: ["employeeId"],
  inventory: ["sku", "name"],
};

/**
 * tr-Kayıt için okunabilir bir etiket üretir.
 * en-Builds a readable label from the first populated label field, falling
 *    back to the id so the audit entry is never empty.
 * input (entity, record)
 * output (string)
 */
function buildLabel(
  entity: DeletableEntity,
  record: Record<string, unknown>
): string {
  for (const field of LABEL_FIELDS[entity]) {
    const value = record[field];
    if (typeof value === "string" && value.trim()) return value;
  }
  return String(record.id ?? "unknown");
}

/**
 * tr-Silinemeyecek kullanıcıları reddeder.
 * en-Refuses deletions that would lock the platform out of its own console.
 *
 *    Two guards, both non-negotiable:
 *      - an admin cannot delete their own account (irreversible self-lockout);
 *      - no account on the PLATFORM_ADMIN_USER_IDS allowlist can be deleted,
 *        or a two-admin platform could be reduced to zero admins with two
 *        clicks and no way back in.
 * input (admin, userId)
 * output (void)
 */
function assertUserDeletable(admin: AuthenticatedUser, userId: string): void {
  if (userId === admin.id) {
    throw new ValidationError("You cannot delete your own account");
  }

  // isPlatformAdmin only needs the id; the rest of the shape is irrelevant.
  if (isPlatformAdmin({ ...admin, id: userId })) {
    throw new ValidationError(
      "This account is a platform administrator and cannot be deleted. " +
        "Remove it from PLATFORM_ADMIN_USER_IDS first."
    );
  }
}

/**
 * tr-Bir kaydı yumuşak siler.
 * en-Soft-deletes a record by stamping `deletedAt`.
 *
 *    Idempotent in spirit but explicit in practice: deleting an
 *    already-deleted record is reported as a conflict rather than silently
 *    succeeding, so the operator knows their action had no effect.
 * input (admin, entity, id)
 * output (Promise<DeletionResult>)
 */
export async function softDeleteRecord(
  admin: AuthenticatedUser,
  entity: DeletableEntity,
  id: string,
  confirmLabel?: string
): Promise<DeletionResult> {
  const delegate = DELEGATES[entity];
  if (!delegate) {
    throw new ValidationError(`Entity "${entity}" cannot be deleted`);
  }

  if (entity === "user") {
    assertUserDeletable(admin, id);
  }

  // INCLUDE_DELETED so an already-deleted record is found and reported as a
  // conflict, rather than looking like it never existed.
  const existing = await delegate.findFirst({
    where: { id, ...INCLUDE_DELETED },
  });

  if (!existing) {
    throw new NotFoundError(entity);
  }

  if (existing.deletedAt) {
    throw new ConflictError("This record is already deleted");
  }

  const label = buildLabel(entity, existing);

  // Typed confirmation for companies, checked BEFORE the write: deleting a
  // tenant hides it and every one of its users, so it must not be reachable by
  // a mis-click or a stray Enter key. Compared against the record's real name
  // read from the database, not a value the client asserted.
  if (entity === "company" && confirmLabel !== label) {
    throw new ValidationError(
      "Confirmation text does not match the company name",
      { confirmLabel: ["Type the company name exactly to confirm"] }
    );
  }

  const deletedAt = new Date();

  await delegate.update({ where: { id }, data: { deletedAt } });

  // A deleted user must not keep working until their access token expires.
  if (entity === "user") {
    await revokeAllUserSessions(id);
  }

  // Deleting a company hides its users too (they are soft-deleted with it),
  // so their sessions must go as well.
  let cascadeSummary: Record<string, number> | undefined;
  if (entity === "company") {
    cascadeSummary = await softDeleteCompanyMembers(id, deletedAt);
  }

  logger.info(
    `[admin/deletion] ${entity} ${id} (${label}) soft-deleted by ${admin.id}`
  );

  return {
    entity,
    id,
    deletedAt: deletedAt.toISOString(),
    label,
    ...(cascadeSummary ? { cascadeSummary } : {}),
  };
}

/**
 * tr-Şirket silindiğinde üyelerini de yumuşak siler ve oturumlarını kapatır.
 * en-Soft-deletes a deleted company's users and kills their sessions.
 *
 *    Without this a "deleted" company's staff could still sign in and operate,
 *    which would make the deletion cosmetic. Other domain records (vehicles,
 *    shipments, …) are left alone deliberately: they are already unreachable
 *    because every query is scoped by companyId, and stamping millions of rows
 *    would turn one click into a long-running write.
 * input (companyId, deletedAt)
 * output (Promise<Record<string, number>>)
 */
async function softDeleteCompanyMembers(
  companyId: string,
  deletedAt: Date
): Promise<Record<string, number>> {
  const members = await db.user.findMany({
    where: { companyId },
    select: { id: true },
  });

  if (members.length === 0) return { users: 0 };

  await db.user.updateMany({
    where: { companyId },
    data: { deletedAt },
  });

  // Revoke sequentially-but-concurrently; each call touches Redis and the DB.
  await Promise.all(members.map((member) => revokeAllUserSessions(member.id)));

  return { users: members.length };
}

/**
 * tr-Yumuşak silinmiş bir kaydı geri yükler.
 * en-Restores a soft-deleted record by clearing `deletedAt`.
 *
 *    Restoring a user does NOT restore their sessions — those were revoked and
 *    must be re-established by signing in again.
 * input (admin, entity, id)
 * output (Promise<DeletionResult>)
 */
export async function restoreRecord(
  admin: AuthenticatedUser,
  entity: DeletableEntity,
  id: string
): Promise<DeletionResult> {
  const delegate = DELEGATES[entity];
  if (!delegate) {
    throw new ValidationError(`Entity "${entity}" cannot be restored`);
  }

  const existing = await delegate.findFirst({
    where: { id, ...INCLUDE_DELETED },
  });

  if (!existing) {
    throw new NotFoundError(entity);
  }

  if (!existing.deletedAt) {
    throw new ConflictError("This record is not deleted");
  }

  await delegate.update({ where: { id }, data: { deletedAt: null } });

  const label = buildLabel(entity, existing);

  logger.info(
    `[admin/deletion] ${entity} ${id} (${label}) restored by ${admin.id}`
  );

  return { entity, id, deletedAt: null, label };
}

/**
 * tr-Yumuşak silinmiş bir kullanıcıyı veritabanından kalıcı olarak siler.
 * en-Permanently erases an already soft-deleted user from the database.
 *
 *    Only reachable for a user whose `deletedAt` is already set — never a
 *    live account — so this is a second, deliberate step on top of
 *    `softDeleteRecord`, not an alternative to it. Nearly every FK onto
 *    `users` is `onDelete: Restrict` (see the file header), so a plain
 *    `db.user.delete` would be rejected by Postgres the moment any dependent
 *    row exists. Mirrors `deleteCompany`'s ordered-transaction approach:
 *      - rows that only make sense tied to this user (their own invitations)
 *        are deleted outright;
 *      - rows that must survive the user (audit trail, inventory movements,
 *        shipment history, warehouse assignments) are kept and have their
 *        `userId`/equivalent FK cleared instead, so the record — and the
 *        fact that *someone* did this — isn't lost, only who.
 *      - rows already `onDelete: Cascade` (sessions, driver profile,
 *        subscription, tokens, the user's own join requests) are left for
 *        Postgres to remove with the final `user.delete`.
 * input (admin, userId)
 * output (Promise<DeletionResult>)
 */
export async function hardDeleteUser(
  admin: AuthenticatedUser,
  userId: string
): Promise<DeletionResult> {
  assertUserDeletable(admin, userId);

  const existing = await db.user.findFirst({
    where: { id: userId, ...INCLUDE_DELETED },
  });

  if (!existing) {
    throw new NotFoundError("user");
  }

  if (!existing.deletedAt) {
    throw new ValidationError(
      "Only an already soft-deleted user can be permanently erased. Delete it first."
    );
  }

  const label = buildLabel("user", existing);

  await db.$transaction(async (tx) => {
    await tx.invitation.deleteMany({ where: { invitedById: userId } });
    await tx.auditLog.updateMany({
      where: { userId },
      data: { userId: null },
    });
    await tx.inventoryMovement.updateMany({
      where: { userId },
      data: { userId: null },
    });
    await tx.shipmentHistory.updateMany({
      where: { createdById: userId },
      data: { createdById: null },
    });
    await tx.warehouse.updateMany({
      where: { managerId: userId },
      data: { managerId: null },
    });
    await tx.warehouseTask.updateMany({
      where: { assignedToId: userId },
      data: { assignedToId: null },
    });
    await tx.user.delete({ where: { id: userId } });
  });

  logger.info(
    `[admin/deletion] user ${userId} (${label}) permanently erased by ${admin.id}`
  );

  return { entity: "user", id: userId, deletedAt: null, label };
}

/**
 * tr-Yumuşak silinmiş kayıtları listeler.
 * en-Lists soft-deleted records for the restore view.
 * input (entity, limit)
 * output (Promise<{ id: string; label: string; deletedAt: string }[]>)
 */
export async function listDeletedRecords(
  entity: DeletableEntity,
  limit = 50
): Promise<{ id: string; label: string; deletedAt: string }[]> {
  const delegate = DELEGATES[entity] as unknown as {
    findMany: (args: unknown) => Promise<Record<string, unknown>[]>;
  };
  if (!delegate) {
    throw new ValidationError(`Entity "${entity}" is not deletable`);
  }

  const rows = await delegate.findMany({
    where: { deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
    take: Math.min(Math.max(limit, 1), 100),
  });

  return rows.map((row) => ({
    id: String(row.id),
    label: buildLabel(entity, row),
    deletedAt: (row.deletedAt as Date).toISOString(),
  }));
}
