-- AlterTable
ALTER TABLE "inventory_movements" ADD COLUMN     "zone" TEXT;

-- AlterTable
ALTER TABLE "issues" ADD COLUMN     "warehouseId" TEXT,
ADD COLUMN     "zone" TEXT;

-- CreateIndex
CREATE INDEX "issues_warehouseId_idx" ON "issues"("warehouseId");

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
