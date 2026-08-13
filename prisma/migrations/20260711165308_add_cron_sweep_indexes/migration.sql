-- CreateIndex
CREATE INDEX "drivers_licenseExpiry_idx" ON "drivers"("licenseExpiry");

-- CreateIndex
CREATE INDEX "routes_status_idx" ON "routes"("status");

-- CreateIndex
CREATE INDEX "vehicles_registrationExpiry_idx" ON "vehicles"("registrationExpiry");

-- CreateIndex
CREATE INDEX "vehicles_inspectionExpiry_idx" ON "vehicles"("inspectionExpiry");
