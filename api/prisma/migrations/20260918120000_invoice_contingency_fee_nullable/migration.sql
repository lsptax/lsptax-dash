-- Distinguish unset contingency (null → client default) from an explicit 0% fee.
ALTER TABLE "Invoice" ALTER COLUMN "contingencyFee" DROP NOT NULL;
ALTER TABLE "Invoice" ALTER COLUMN "contingencyFee" DROP DEFAULT;
UPDATE "Invoice" SET "contingencyFee" = NULL WHERE "contingencyFee" = 0;
