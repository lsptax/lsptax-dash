-- Move lifecycle columns from Client to Property.
-- Lifecycle is now tracked per property (each property has its own protest cycle).

-- AlterTable: drop on Client
ALTER TABLE "Client"
  DROP COLUMN "lifecyclePhase",
  DROP COLUMN "lifecycleStep",
  DROP COLUMN "lifecycleHistory",
  DROP COLUMN "lifecycleCompletedAt",
  DROP COLUMN "lifecycleNotes";

-- AlterTable: add on Property
ALTER TABLE "Property"
  ADD COLUMN "lifecyclePhase" TEXT,
  ADD COLUMN "lifecycleStep" TEXT,
  ADD COLUMN "lifecycleHistory" JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "lifecycleCompletedAt" TIMESTAMP(3),
  ADD COLUMN "lifecycleNotes" TEXT;
