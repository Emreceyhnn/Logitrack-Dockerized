-- CreateEnum
CREATE TYPE "ServiceTier" AS ENUM ('SAME_DAY', 'NEXT_DAY', 'STANDARD_48H');

-- AlterTable
ALTER TABLE "shipments" ADD COLUMN     "serviceTier" "ServiceTier";
