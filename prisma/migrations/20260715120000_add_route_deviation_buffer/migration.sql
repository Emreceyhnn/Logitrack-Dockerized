-- AlterTable
ALTER TABLE "routes" ADD COLUMN     "shape" TEXT,
ADD COLUMN     "bufferMeters" INTEGER;

-- CreateIndex
CREATE INDEX "routes_vehicleId_status_idx" ON "routes"("vehicleId", "status");
