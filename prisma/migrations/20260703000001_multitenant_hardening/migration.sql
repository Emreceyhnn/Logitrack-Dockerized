-- ============================================================================
-- Multi-tenant hardening migration (data-preserving)
--  * companyId NOT NULL on all tenant tables + companyId added to child tables
--  * tenant-scoped composite uniques replace global uniques
--  * Float -> Decimal for money, String -> enum for status/type columns
--  * Cascade -> Restrict on financial/compliance history
--  * FK index package, soft-delete columns, Route.stops JSON -> route_stops
-- ============================================================================

-- ── 1. Enums ────────────────────────────────────────────────────────────────
CREATE TYPE "FuelType" AS ENUM ('DIESEL', 'GASOLINE', 'ELECTRIC', 'HYBRID');
CREATE TYPE "ShipmentServiceType" AS ENUM ('STANDARD_FREIGHT', 'EXPRESS', 'HAZARDOUS');
CREATE TYPE "MaintenanceType" AS ENUM ('ROUTINE_MAINTENANCE', 'REPAIR', 'INSPECTION', 'TIRE_CHANGE', 'OIL_CHANGE', 'OTHER');
CREATE TYPE "DocumentType" AS ENUM ('REGISTRATION', 'TRAILER_REGISTRATION', 'INSURANCE', 'LICENSE', 'INSPECTION', 'MAINTENANCE', 'OTHER');
CREATE TYPE "DocumentStatus" AS ENUM ('ACTIVE', 'MISSING', 'EXPIRING_SOON', 'EXPIRED');
CREATE TYPE "MovementType" AS ENUM ('STOCK_IN', 'PUTAWAY', 'PICK', 'PACK', 'RESTOCK', 'RESTOCK_REQUEST', 'ADJUSTMENT');

-- ── 2. Drop FKs that change referential actions ─────────────────────────────
ALTER TABLE "customers" DROP CONSTRAINT "customers_companyId_fkey";
ALTER TABLE "documents" DROP CONSTRAINT "documents_companyId_fkey";
ALTER TABLE "documents" DROP CONSTRAINT "documents_trailerId_fkey";
ALTER TABLE "documents" DROP CONSTRAINT "documents_vehicleId_fkey";
ALTER TABLE "drivers" DROP CONSTRAINT "drivers_companyId_fkey";
ALTER TABLE "fuel_logs" DROP CONSTRAINT "fuel_logs_companyId_fkey";
ALTER TABLE "fuel_logs" DROP CONSTRAINT "fuel_logs_vehicleId_fkey";
ALTER TABLE "inventory" DROP CONSTRAINT "inventory_companyId_fkey";
ALTER TABLE "inventory_movements" DROP CONSTRAINT "inventory_movements_companyId_fkey";
ALTER TABLE "issues" DROP CONSTRAINT "issues_companyId_fkey";
ALTER TABLE "maintenance_records" DROP CONSTRAINT "maintenance_records_vehicleId_fkey";
ALTER TABLE "routes" DROP CONSTRAINT "routes_companyId_fkey";
ALTER TABLE "shipments" DROP CONSTRAINT "shipments_companyId_fkey";
ALTER TABLE "trailer_assignments" DROP CONSTRAINT "trailer_assignments_trailerId_fkey";
ALTER TABLE "trailer_assignments" DROP CONSTRAINT "trailer_assignments_vehicleId_fkey";
ALTER TABLE "trailers" DROP CONSTRAINT "trailers_companyId_fkey";
ALTER TABLE "vehicles" DROP CONSTRAINT "vehicles_companyId_fkey";
ALTER TABLE "warehouse_tasks" DROP CONSTRAINT "warehouse_tasks_companyId_fkey";
ALTER TABLE "warehouse_zones" DROP CONSTRAINT "warehouse_zones_companyId_fkey";
ALTER TABLE "warehouses" DROP CONSTRAINT "warehouses_companyId_fkey";

-- ── 3. String -> enum conversions (map legacy values, then cast in place) ───

-- documents.type
UPDATE "documents" SET "type" = 'OTHER'
WHERE "type" NOT IN ('REGISTRATION','TRAILER_REGISTRATION','INSURANCE','LICENSE','INSPECTION','MAINTENANCE','OTHER');
ALTER TABLE "documents" ALTER COLUMN "type" SET DATA TYPE "DocumentType" USING "type"::"DocumentType";

-- documents.status (legacy seed values VALID/VERIFIED -> ACTIVE)
UPDATE "documents" SET "status" = 'ACTIVE' WHERE "status" IN ('VALID','VERIFIED');
UPDATE "documents" SET "status" = 'ACTIVE'
WHERE "status" NOT IN ('ACTIVE','MISSING','EXPIRING_SOON','EXPIRED');
ALTER TABLE "documents" ALTER COLUMN "status" SET DATA TYPE "DocumentStatus" USING "status"::"DocumentStatus";

-- maintenance_records.type (legacy free text 'Full Service' -> ROUTINE_MAINTENANCE)
UPDATE "maintenance_records" SET "type" = 'ROUTINE_MAINTENANCE' WHERE "type" = 'Full Service';
UPDATE "maintenance_records" SET "type" = 'OTHER'
WHERE "type" NOT IN ('ROUTINE_MAINTENANCE','REPAIR','INSPECTION','TIRE_CHANGE','OIL_CHANGE','OTHER');
ALTER TABLE "maintenance_records" ALTER COLUMN "type" SET DATA TYPE "MaintenanceType" USING "type"::"MaintenanceType";

-- vehicles.fuelType / fuel_logs.fuelType
UPDATE "vehicles" SET "fuelType" = 'DIESEL' WHERE "fuelType" NOT IN ('DIESEL','GASOLINE','ELECTRIC','HYBRID');
ALTER TABLE "vehicles" ALTER COLUMN "fuelType" SET DATA TYPE "FuelType" USING "fuelType"::"FuelType";
UPDATE "fuel_logs" SET "fuelType" = 'DIESEL' WHERE "fuelType" NOT IN ('DIESEL','GASOLINE','ELECTRIC','HYBRID');
ALTER TABLE "fuel_logs" ALTER COLUMN "fuelType" SET DATA TYPE "FuelType" USING "fuelType"::"FuelType";

-- inventory_movements.type
UPDATE "inventory_movements" SET "type" = 'ADJUSTMENT'
WHERE "type" NOT IN ('STOCK_IN','PUTAWAY','PICK','PACK','RESTOCK','RESTOCK_REQUEST','ADJUSTMENT');
ALTER TABLE "inventory_movements" ALTER COLUMN "type" SET DATA TYPE "MovementType" USING "type"::"MovementType";

-- shipment_history.status -> ShipmentStatus
UPDATE "shipment_history" SET "status" = 'PENDING'
WHERE "status" NOT IN ('PENDING','PROCESSING','ASSIGNED','IN_TRANSIT','DELIVERED','DELAYED','CANCELLED');
ALTER TABLE "shipment_history" ALTER COLUMN "status" SET DATA TYPE "ShipmentStatus" USING "status"::"ShipmentStatus";

-- shipments.type ('Standard Freight' | 'Express' | 'Hazardous' -> enum)
ALTER TABLE "shipments" ALTER COLUMN "type" DROP DEFAULT;
UPDATE "shipments" SET "type" = 'STANDARD_FREIGHT' WHERE "type" = 'Standard Freight';
UPDATE "shipments" SET "type" = 'EXPRESS' WHERE "type" = 'Express';
UPDATE "shipments" SET "type" = 'HAZARDOUS' WHERE "type" = 'Hazardous';
UPDATE "shipments" SET "type" = 'STANDARD_FREIGHT'
WHERE "type" IS NOT NULL AND "type" NOT IN ('STANDARD_FREIGHT','EXPRESS','HAZARDOUS');
ALTER TABLE "shipments" ALTER COLUMN "type" SET DATA TYPE "ShipmentServiceType" USING "type"::"ShipmentServiceType";
ALTER TABLE "shipments" ALTER COLUMN "type" SET DEFAULT 'STANDARD_FREIGHT';

-- ── 4. Money Float -> Decimal, palletCount Float -> Int ─────────────────────
ALTER TABLE "maintenance_records"
  ADD COLUMN "originalCost" DECIMAL(12,2),
  ADD COLUMN "originalCurrency" TEXT,
  ALTER COLUMN "cost" SET DATA TYPE DECIMAL(12,2);
ALTER TABLE "fuel_logs" ALTER COLUMN "cost" SET DATA TYPE DECIMAL(12,2);
ALTER TABLE "inventory" ALTER COLUMN "unitValue" SET DATA TYPE DECIMAL(12,2);

ALTER TABLE "inventory" ALTER COLUMN "palletCount" SET DATA TYPE INTEGER USING round("palletCount")::integer;
ALTER TABLE "inventory" ALTER COLUMN "palletCount" SET DEFAULT 0;
ALTER TABLE "shipments" ALTER COLUMN "palletCount" SET DATA TYPE INTEGER USING round("palletCount")::integer;
ALTER TABLE "shipments" ALTER COLUMN "palletCount" SET DEFAULT 0;
ALTER TABLE "shipment_items" ALTER COLUMN "palletCount" SET DATA TYPE INTEGER USING round("palletCount")::integer;
ALTER TABLE "shipment_items" ALTER COLUMN "palletCount" SET DEFAULT 0;

-- ── 5. companyId on child tables: add nullable, backfill from parent, lock ──
ALTER TABLE "maintenance_records" ADD COLUMN "companyId" TEXT;
UPDATE "maintenance_records" m SET "companyId" = v."companyId"
FROM "vehicles" v WHERE v."id" = m."vehicleId";
ALTER TABLE "maintenance_records" ALTER COLUMN "companyId" SET NOT NULL;

ALTER TABLE "customer_locations" ADD COLUMN "companyId" TEXT;
UPDATE "customer_locations" l SET "companyId" = c."companyId"
FROM "customers" c WHERE c."id" = l."customerId";
ALTER TABLE "customer_locations" ALTER COLUMN "companyId" SET NOT NULL;

ALTER TABLE "shipment_history" ADD COLUMN "companyId" TEXT;
UPDATE "shipment_history" h SET "companyId" = s."companyId"
FROM "shipments" s WHERE s."id" = h."shipmentId";
ALTER TABLE "shipment_history" ALTER COLUMN "companyId" SET NOT NULL;

ALTER TABLE "shipment_stops" ADD COLUMN "companyId" TEXT;
UPDATE "shipment_stops" st SET "companyId" = s."companyId"
FROM "shipments" s WHERE s."id" = st."shipmentId";
ALTER TABLE "shipment_stops" ALTER COLUMN "companyId" SET NOT NULL;

ALTER TABLE "shipment_items" ADD COLUMN "companyId" TEXT;
UPDATE "shipment_items" it SET "companyId" = s."companyId"
FROM "shipments" s WHERE s."id" = it."shipmentId";
ALTER TABLE "shipment_items" ALTER COLUMN "companyId" SET NOT NULL;

ALTER TABLE "trailer_assignments" ADD COLUMN "companyId" TEXT;
UPDATE "trailer_assignments" ta SET "companyId" = t."companyId"
FROM "trailers" t WHERE t."id" = ta."trailerId";
ALTER TABLE "trailer_assignments" ALTER COLUMN "companyId" SET NOT NULL;

-- roles: NULL companyId = immutable system role; custom roles get the company
-- of the users they were created for
ALTER TABLE "roles" ADD COLUMN "companyId" TEXT;
UPDATE "roles" r SET "companyId" = (
  SELECT u."companyId" FROM "users" u
  WHERE u."roleId" = r."id" AND u."companyId" IS NOT NULL
  LIMIT 1
)
WHERE r."id" NOT IN ('role_admin','role_manager','role_dispatcher','role_driver','role_warehouse','role_default');

-- ── 6. Lock down existing tenant columns (verified: no NULLs in data) ───────
ALTER TABLE "customers" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "documents" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "drivers" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "fuel_logs" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "inventory" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "inventory_movements" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "issues" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "routes" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "shipments" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "trailers" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "vehicles" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "warehouse_tasks" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "warehouse_zones" ALTER COLUMN "companyId" SET NOT NULL;
ALTER TABLE "warehouses" ALTER COLUMN "companyId" SET NOT NULL;

-- ── 7. Soft delete ──────────────────────────────────────────────────────────
ALTER TABLE "vehicles" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "trailers" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- ── 8. Route.stops JSON -> route_stops table (migrate data, then drop) ──────
CREATE TABLE "route_stops" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "address" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "route_stops_pkey" PRIMARY KEY ("id")
);

INSERT INTO "route_stops" ("id", "routeId", "companyId", "sequence", "address", "lat", "lng", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  r."id",
  r."companyId",
  (s.ord - 1)::integer,
  s.elem->>'address',
  NULLIF(s.elem->>'lat', '')::double precision,
  NULLIF(s.elem->>'lng', '')::double precision,
  r."createdAt",
  CURRENT_TIMESTAMP
FROM "routes" r
CROSS JOIN LATERAL jsonb_array_elements(r."stops") WITH ORDINALITY AS s(elem, ord)
WHERE jsonb_typeof(r."stops") = 'array'
  AND jsonb_typeof(s.elem) = 'object'
  AND s.elem->>'address' IS NOT NULL;

ALTER TABLE "routes" DROP COLUMN "stops";

-- ── 9. exchange_rates: one row per (base, day) ──────────────────────────────
DELETE FROM "exchange_rates" e USING "exchange_rates" newer
WHERE e."base" = newer."base"
  AND e."date"::date = newer."date"::date
  AND (newer."createdAt" > e."createdAt"
       OR (newer."createdAt" = e."createdAt" AND newer."id" > e."id"));
ALTER TABLE "exchange_rates" ALTER COLUMN "date" SET DATA TYPE DATE;

-- ── 10. Index strategy: drop redundant/global, create tenant-scoped ─────────
DROP INDEX "audit_logs_userId_idx";
DROP INDEX "customers_code_key";
DROP INDEX "drivers_employeeId_key";
DROP INDEX "roles_name_key";
DROP INDEX "sessions_refreshToken_idx";
DROP INDEX "sessions_token_idx";
DROP INDEX "trailers_fleetNo_key";
DROP INDEX "trailers_plate_key";
DROP INDEX "vehicles_fleetNo_key";
DROP INDEX "vehicles_plate_key";
DROP INDEX "warehouse_zones_warehouseId_idx";
DROP INDEX "warehouses_code_key";

CREATE INDEX "route_stops_routeId_sequence_idx" ON "route_stops"("routeId", "sequence");
CREATE INDEX "route_stops_companyId_idx" ON "route_stops"("companyId");
CREATE INDEX "audit_logs_userId_createdAt_idx" ON "audit_logs"("userId", "createdAt");
CREATE INDEX "customer_locations_customerId_idx" ON "customer_locations"("customerId");
CREATE INDEX "customer_locations_companyId_idx" ON "customer_locations"("companyId");
CREATE INDEX "customers_companyId_idx" ON "customers"("companyId");
CREATE UNIQUE INDEX "customers_companyId_code_key" ON "customers"("companyId", "code");
CREATE INDEX "documents_companyId_expiryDate_idx" ON "documents"("companyId", "expiryDate");
CREATE INDEX "documents_driverId_idx" ON "documents"("driverId");
CREATE INDEX "documents_vehicleId_idx" ON "documents"("vehicleId");
CREATE INDEX "documents_trailerId_idx" ON "documents"("trailerId");
CREATE INDEX "drivers_homeBaseWarehouseId_idx" ON "drivers"("homeBaseWarehouseId");
CREATE UNIQUE INDEX "drivers_companyId_employeeId_key" ON "drivers"("companyId", "employeeId");
CREATE UNIQUE INDEX "exchange_rates_base_date_key" ON "exchange_rates"("base", "date");
CREATE INDEX "fuel_logs_vehicleId_date_idx" ON "fuel_logs"("vehicleId", "date");
CREATE INDEX "fuel_logs_driverId_date_idx" ON "fuel_logs"("driverId", "date");
CREATE INDEX "inventory_companyId_idx" ON "inventory"("companyId");
CREATE INDEX "inventory_movements_companyId_date_idx" ON "inventory_movements"("companyId", "date");
CREATE INDEX "inventory_movements_userId_idx" ON "inventory_movements"("userId");
CREATE INDEX "issues_companyId_status_idx" ON "issues"("companyId", "status");
CREATE INDEX "issues_vehicleId_idx" ON "issues"("vehicleId");
CREATE INDEX "issues_driverId_idx" ON "issues"("driverId");
CREATE INDEX "issues_shipmentId_idx" ON "issues"("shipmentId");
CREATE INDEX "issues_trailerId_idx" ON "issues"("trailerId");
CREATE INDEX "maintenance_records_vehicleId_date_idx" ON "maintenance_records"("vehicleId", "date");
CREATE INDEX "maintenance_records_companyId_date_idx" ON "maintenance_records"("companyId", "date");
CREATE INDEX "roles_companyId_idx" ON "roles"("companyId");
CREATE UNIQUE INDEX "roles_companyId_name_key" ON "roles"("companyId", "name");
CREATE INDEX "routes_companyId_date_idx" ON "routes"("companyId", "date");
CREATE INDEX "routes_driverId_date_idx" ON "routes"("driverId", "date");
CREATE INDEX "routes_vehicleId_idx" ON "routes"("vehicleId");
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");
CREATE INDEX "shipment_history_companyId_idx" ON "shipment_history"("companyId");
CREATE INDEX "shipment_items_shipmentId_idx" ON "shipment_items"("shipmentId");
CREATE INDEX "shipment_items_companyId_idx" ON "shipment_items"("companyId");
CREATE INDEX "shipment_stops_shipmentId_sequence_idx" ON "shipment_stops"("shipmentId", "sequence");
CREATE INDEX "shipment_stops_customerId_idx" ON "shipment_stops"("customerId");
CREATE INDEX "shipment_stops_customerLocationId_idx" ON "shipment_stops"("customerLocationId");
CREATE INDEX "shipment_stops_companyId_idx" ON "shipment_stops"("companyId");
CREATE INDEX "shipments_companyId_createdAt_idx" ON "shipments"("companyId", "createdAt");
CREATE INDEX "shipments_driverId_status_idx" ON "shipments"("driverId", "status");
CREATE INDEX "shipments_customerId_idx" ON "shipments"("customerId");
CREATE INDEX "shipments_customerLocationId_idx" ON "shipments"("customerLocationId");
CREATE INDEX "shipments_routeId_idx" ON "shipments"("routeId");
CREATE INDEX "shipments_originWarehouseId_idx" ON "shipments"("originWarehouseId");
CREATE INDEX "shipments_trailerId_idx" ON "shipments"("trailerId");
CREATE INDEX "trailer_assignments_trailerId_assignedAt_idx" ON "trailer_assignments"("trailerId", "assignedAt");
CREATE INDEX "trailer_assignments_vehicleId_assignedAt_idx" ON "trailer_assignments"("vehicleId", "assignedAt");
CREATE INDEX "trailer_assignments_companyId_idx" ON "trailer_assignments"("companyId");
CREATE INDEX "trailers_companyId_status_idx" ON "trailers"("companyId", "status");
CREATE UNIQUE INDEX "trailers_companyId_fleetNo_key" ON "trailers"("companyId", "fleetNo");
CREATE UNIQUE INDEX "trailers_companyId_plate_key" ON "trailers"("companyId", "plate");
CREATE INDEX "users_companyId_idx" ON "users"("companyId");
CREATE INDEX "users_roleId_idx" ON "users"("roleId");
CREATE INDEX "vehicles_companyId_status_idx" ON "vehicles"("companyId", "status");
CREATE UNIQUE INDEX "vehicles_companyId_fleetNo_key" ON "vehicles"("companyId", "fleetNo");
CREATE UNIQUE INDEX "vehicles_companyId_plate_key" ON "vehicles"("companyId", "plate");
CREATE INDEX "warehouse_tasks_companyId_status_idx" ON "warehouse_tasks"("companyId", "status");
CREATE INDEX "warehouse_tasks_assignedToId_status_idx" ON "warehouse_tasks"("assignedToId", "status");
CREATE INDEX "warehouse_zones_companyId_idx" ON "warehouse_zones"("companyId");
CREATE INDEX "warehouses_companyId_idx" ON "warehouses"("companyId");
CREATE INDEX "warehouses_managerId_idx" ON "warehouses"("managerId");
CREATE UNIQUE INDEX "warehouses_companyId_code_key" ON "warehouses"("companyId", "code");

-- ── 11. Recreate FKs with intentional referential actions ───────────────────
ALTER TABLE "roles" ADD CONSTRAINT "roles_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "maintenance_records" ADD CONSTRAINT "maintenance_records_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "warehouse_zones" ADD CONSTRAINT "warehouse_zones_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "warehouse_tasks" ADD CONSTRAINT "warehouse_tasks_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customers" ADD CONSTRAINT "customers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_locations" ADD CONSTRAINT "customer_locations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shipment_history" ADD CONSTRAINT "shipment_history_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shipment_stops" ADD CONSTRAINT "shipment_stops_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shipment_items" ADD CONSTRAINT "shipment_items_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "routes" ADD CONSTRAINT "routes_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_trailerId_fkey" FOREIGN KEY ("trailerId") REFERENCES "trailers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fuel_logs" ADD CONSTRAINT "fuel_logs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "fuel_logs" ADD CONSTRAINT "fuel_logs_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "issues" ADD CONSTRAINT "issues_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "trailers" ADD CONSTRAINT "trailers_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "trailer_assignments" ADD CONSTRAINT "trailer_assignments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "trailer_assignments" ADD CONSTRAINT "trailer_assignments_trailerId_fkey" FOREIGN KEY ("trailerId") REFERENCES "trailers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "trailer_assignments" ADD CONSTRAINT "trailer_assignments_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
