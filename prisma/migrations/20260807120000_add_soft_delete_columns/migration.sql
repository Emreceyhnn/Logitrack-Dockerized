-- Soft delete support for the admin console's delete actions.
--
-- WHY SOFT DELETE RATHER THAN DROPPING ROWS
-- Almost every foreign key in this schema is `onDelete: Restrict`, so a real
-- DELETE on a company or user is rejected by Postgres as soon as any dependent
-- row exists — and `audit_logs.userId` is Restrict too, meaning a hard delete
-- of a user would either fail or destroy its own audit trail. Soft delete keeps
-- the referential graph intact, preserves the audit record, and is reversible.
-- It also matches the project's stated invariant: domain entities are
-- soft-deleted, never hard-deleted.
--
-- `vehicles` and `trailers` already carry `deletedAt` and are handled by the
-- tenant-guard extension in app/lib/db.ts; this migration brings the remaining
-- browsable/manageable models in line.
--
-- All columns are nullable with no default, so every existing row stays live
-- (NULL = not deleted). No backfill is required and the migration is additive.

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "drivers" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "warehouses" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "inventory" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "shipments" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "routes" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- Partial indexes on the live rows only.
--
-- Every read through the tenant guard now appends `deletedAt IS NULL`, which
-- would otherwise force a filter on top of the existing composite indexes. A
-- partial index covers exactly the rows the app actually queries and stays
-- small, because soft-deleted rows are excluded from the index entirely.
CREATE INDEX "companies_deletedAt_idx" ON "companies"("deletedAt") WHERE "deletedAt" IS NULL;
CREATE INDEX "users_deletedAt_idx" ON "users"("deletedAt") WHERE "deletedAt" IS NULL;
CREATE INDEX "drivers_deletedAt_idx" ON "drivers"("deletedAt") WHERE "deletedAt" IS NULL;
CREATE INDEX "warehouses_deletedAt_idx" ON "warehouses"("deletedAt") WHERE "deletedAt" IS NULL;
CREATE INDEX "customers_deletedAt_idx" ON "customers"("deletedAt") WHERE "deletedAt" IS NULL;
CREATE INDEX "inventory_deletedAt_idx" ON "inventory"("deletedAt") WHERE "deletedAt" IS NULL;
CREATE INDEX "shipments_deletedAt_idx" ON "shipments"("deletedAt") WHERE "deletedAt" IS NULL;
CREATE INDEX "routes_deletedAt_idx" ON "routes"("deletedAt") WHERE "deletedAt" IS NULL;
