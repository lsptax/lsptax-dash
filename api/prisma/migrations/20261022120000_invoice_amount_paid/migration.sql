-- Amount received toward an invoice. Full payments are backfilled to the invoice amount.

ALTER TABLE "Invoice" ADD COLUMN "amountPaid" DECIMAL(15,2) NOT NULL DEFAULT 0;

UPDATE "Invoice"
SET "amountPaid" = "invoiceAmount"
WHERE "isPaid" = true
  AND "amountPaid" = 0;
