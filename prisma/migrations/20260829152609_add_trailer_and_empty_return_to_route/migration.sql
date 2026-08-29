-- AlterTable
ALTER TABLE "routes" ADD COLUMN     "isEmptyReturn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "trailerId" TEXT;

-- CreateIndex
CREATE INDEX "routes_trailerId_idx" ON "routes"("trailerId");

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_trailerId_fkey" FOREIGN KEY ("trailerId") REFERENCES "trailers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
