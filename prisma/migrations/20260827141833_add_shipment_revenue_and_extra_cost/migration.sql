-- AlterTable
ALTER TABLE "shipments" ADD COLUMN     "currency" TEXT,
ADD COLUMN     "extraCostAmount" DECIMAL(12,2),
ADD COLUMN     "extraCostNote" TEXT,
ADD COLUMN     "revenue" DECIMAL(12,2);
