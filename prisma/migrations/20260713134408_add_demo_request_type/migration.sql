-- CreateEnum
CREATE TYPE "DemoRequestType" AS ENUM ('DEMO', 'CONTACT');

-- AlterTable
ALTER TABLE "demo_requests" ADD COLUMN     "type" "DemoRequestType" NOT NULL DEFAULT 'CONTACT';

-- CreateIndex
CREATE INDEX "demo_requests_type_status_idx" ON "demo_requests"("type", "status");
