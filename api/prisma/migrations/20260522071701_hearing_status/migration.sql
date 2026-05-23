-- CreateEnum
CREATE TYPE "HearingStatus" AS ENUM ('SCHEDULED', 'ATTENDED', 'CANCELLED', 'NO_SHOW');

-- AlterTable
ALTER TABLE "hearings" ADD COLUMN     "status" "HearingStatus" NOT NULL DEFAULT 'SCHEDULED';

-- CreateIndex
CREATE INDEX "hearings_status_idx" ON "hearings"("status");
