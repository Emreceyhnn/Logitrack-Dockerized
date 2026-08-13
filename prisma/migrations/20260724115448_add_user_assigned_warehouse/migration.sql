-- AlterTable
ALTER TABLE "users" ADD COLUMN     "assignedWarehouseId" TEXT;

-- CreateIndex
CREATE INDEX "users_assignedWarehouseId_idx" ON "users"("assignedWarehouseId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_assignedWarehouseId_fkey" FOREIGN KEY ("assignedWarehouseId") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
