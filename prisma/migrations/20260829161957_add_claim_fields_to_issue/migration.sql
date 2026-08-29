-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('NONE', 'FILED', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "issues" ADD COLUMN     "claimFiledAmount" DECIMAL(12,2),
ADD COLUMN     "claimRecoveredAmount" DECIMAL(12,2),
ADD COLUMN     "claimStatus" "ClaimStatus" NOT NULL DEFAULT 'NONE';
