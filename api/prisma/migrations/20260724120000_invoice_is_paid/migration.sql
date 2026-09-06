-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "isPaid" BOOLEAN NOT NULL DEFAULT false;

-- Backfill from existing paidDate values
UPDATE "Invoice"
SET "isPaid" = true
WHERE "paidDate" IS NOT NULL AND TRIM("paidDate") <> '';

-- CreateIndex
CREATE INDEX "Invoice_isPaid_idx" ON "Invoice"("isPaid");
