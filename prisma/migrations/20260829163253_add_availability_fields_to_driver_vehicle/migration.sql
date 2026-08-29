-- AlterEnum
ALTER TYPE "DriverStatus" ADD VALUE 'SICK_LEAVE';

-- AlterEnum
ALTER TYPE "VehicleStatus" ADD VALUE 'BREAKDOWN';

-- AlterTable
ALTER TABLE "drivers" ADD COLUMN     "returnDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN     "estimatedAvailableDate" TIMESTAMP(3);
