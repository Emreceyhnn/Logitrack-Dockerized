-- Warehouse floor issues previously lost the site they came from: the panel
-- verified the warehouse existed but wrote none of it onto the Issue row, so
-- reports could only be traced through free-text titles ("Floor issue — Zone A").
-- Both columns are nullable, so existing issues (vehicle/driver/shipment scoped)
-- are unaffected.

-- AlterTable
ALTER TABLE "issues" ADD COLUMN     "warehouseId" TEXT,
ADD COLUMN     "zone" TEXT;

-- CreateIndex
CREATE INDEX "issues_warehouseId_status_idx" ON "issues"("warehouseId", "status");

-- AddForeignKey
ALTER TABLE "issues" ADD CONSTRAINT "issues_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
