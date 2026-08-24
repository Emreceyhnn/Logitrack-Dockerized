-- NOTE: this migration was originally generated against a database that did not
-- yet have 20260806120000_add_issue_warehouse_zone applied, so it re-declared
-- "issues"."warehouseId"/"zone", their foreign key, and a bare warehouseId
-- index. Those statements are removed here: they fail with 42701 (column
-- already exists) on any database that applied the earlier migration, and the
-- schema tracks the composite @@index([warehouseId, status]) from that
-- migration, not the single-column one this file added.
--
-- The zone column on inventory_movements is what this migration actually
-- contributes, and it is kept.

-- AlterTable
ALTER TABLE "inventory_movements" ADD COLUMN     "zone" TEXT;
