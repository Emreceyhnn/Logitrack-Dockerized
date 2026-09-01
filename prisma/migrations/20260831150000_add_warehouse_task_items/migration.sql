-- WarehouseTask supported only one SKU per task (sku/zone/totalUnits/doneUnits
-- on the task row itself), so a shipment with N distinct SKUs produced N
-- separate tasks. WarehouseTaskItem lets a single task carry multiple SKUs
-- (wave/batch picking is explicitly out of scope — this is item multiplicity
-- only). Existing warehouse_tasks rows are migrated into one item each before
-- the now-redundant columns are dropped from warehouse_tasks.

-- CreateTable
CREATE TABLE "warehouse_task_items" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "zone" TEXT NOT NULL,
    "doneUnits" INTEGER NOT NULL DEFAULT 0,
    "totalUnits" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "warehouse_task_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "warehouse_task_items_taskId_idx" ON "warehouse_task_items"("taskId");

-- CreateIndex
CREATE INDEX "warehouse_task_items_companyId_idx" ON "warehouse_task_items"("companyId");

-- AddForeignKey
ALTER TABLE "warehouse_task_items" ADD CONSTRAINT "warehouse_task_items_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "warehouse_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warehouse_task_items" ADD CONSTRAINT "warehouse_task_items_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- DataMigration: move each existing task's single sku/zone/totalUnits/doneUnits into one item row.
INSERT INTO "warehouse_task_items" ("id", "taskId", "companyId", "sku", "zone", "doneUnits", "totalUnits", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, "id", "companyId", COALESCE("sku", 'UNKNOWN'), "zone", "doneUnits", "totalUnits", "createdAt", "updatedAt"
FROM "warehouse_tasks";

-- AlterTable: columns are now represented per-item on warehouse_task_items.
ALTER TABLE "warehouse_tasks" DROP COLUMN "sku",
DROP COLUMN "zone",
DROP COLUMN "totalUnits",
DROP COLUMN "doneUnits";
