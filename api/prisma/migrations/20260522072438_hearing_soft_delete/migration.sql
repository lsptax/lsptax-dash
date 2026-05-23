-- AlterTable
ALTER TABLE "hearings" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "hearings_deletedAt_idx" ON "hearings"("deletedAt");
