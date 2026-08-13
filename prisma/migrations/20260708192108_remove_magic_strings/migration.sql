-- AlterTable
ALTER TABLE "exchange_rates" ALTER COLUMN "base" DROP DEFAULT;

-- AlterTable
ALTER TABLE "fuel_logs" ALTER COLUMN "currency" DROP DEFAULT;

-- AlterTable
ALTER TABLE "inventory" ALTER COLUMN "currency" DROP DEFAULT,
ALTER COLUMN "unit" DROP DEFAULT,
ALTER COLUMN "cargoType" DROP DEFAULT;

-- AlterTable
ALTER TABLE "maintenance_records" ALTER COLUMN "currency" DROP DEFAULT;

-- AlterTable
ALTER TABLE "shipment_items" ALTER COLUMN "unit" DROP DEFAULT,
ALTER COLUMN "cargoType" DROP DEFAULT;

-- AlterTable
ALTER TABLE "shipments" ALTER COLUMN "cargoType" DROP DEFAULT,
ALTER COLUMN "billingAccount" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "currency" DROP DEFAULT;
