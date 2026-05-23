-- This migration was previously applied to the DB but the folder was deleted locally.
-- Restored to keep migration history in sync.

ALTER TABLE "Property" ADD COLUMN "propertyAddress" TEXT;

