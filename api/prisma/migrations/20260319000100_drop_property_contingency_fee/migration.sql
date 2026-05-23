-- Move contingency fee from Property to Client (no legacy backfill)
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "contingencyFee" TEXT;
ALTER TABLE "Property" DROP COLUMN IF EXISTS "contingencyFee";

