-- CreateEnum
CREATE TYPE "ProspectStatus" AS ENUM ('NOT_CONTACTED', 'CONTACTED', 'IN_PROGRESS');

-- AlterTable
ALTER TABLE "Prospect" ADD COLUMN     "status" "ProspectStatus" NOT NULL DEFAULT 'NOT_CONTACTED';
