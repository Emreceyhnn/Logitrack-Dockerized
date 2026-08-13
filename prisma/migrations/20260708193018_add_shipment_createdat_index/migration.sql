-- DropIndex
DROP INDEX "shipments_companyId_createdAt_idx";

-- CreateIndex
CREATE INDEX "shipments_companyId_createdAt_idx" ON "shipments"("companyId", "createdAt" DESC);
