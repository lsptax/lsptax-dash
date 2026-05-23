-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "lifecycleCompletedAt" TIMESTAMP(3),
ADD COLUMN     "lifecycleHistory" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "lifecycleNotes" TEXT,
ADD COLUMN     "lifecyclePhase" TEXT,
ADD COLUMN     "lifecycleStep" TEXT;
