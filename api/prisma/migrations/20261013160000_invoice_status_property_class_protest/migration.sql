-- Invoice status, property classification, and tax-year protest tracking.

CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'SENT', 'PAID', 'PAST_DUE', 'VOIDED', 'WRITTEN_OFF');
CREATE TYPE "PropertyType" AS ENUM ('RESIDENTIAL', 'COMMERCIAL', 'BPP', 'LAND');
CREATE TYPE "ProtestStatus" AS ENUM ('PENDING', 'COMPLETED', 'RESULTS_PENDING');

ALTER TABLE "Invoice" ADD COLUMN "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "Invoice" ADD COLUMN "protestStatus" "ProtestStatus";
ALTER TABLE "Invoice" ADD COLUMN "protestCompletedDate" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "protestResultDate" TEXT;

ALTER TABLE "Property" ADD COLUMN "propertyType" "PropertyType";
ALTER TABLE "Property" ADD COLUMN "consultantId" INTEGER;

ALTER TABLE "Property"
  ADD CONSTRAINT "Property_consultantId_fkey"
  FOREIGN KEY ("consultantId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");
CREATE INDEX "Invoice_protestStatus_idx" ON "Invoice"("protestStatus");
CREATE INDEX "Property_consultantId_idx" ON "Property"("consultantId");
CREATE INDEX "Property_propertyType_idx" ON "Property"("propertyType");

-- Paid rows stay paid. Issued or emailed rows are Sent. Everything else stays Draft.
UPDATE "Invoice"
SET "status" = 'PAID'
WHERE "isPaid" = true;

UPDATE "Invoice" AS i
SET "status" = 'SENT'
WHERE i."isPaid" = false
  AND (
    NULLIF(btrim(COALESCE(i."invoiceDate", '')), '') IS NOT NULL
    OR NULLIF(btrim(COALESCE(i."generatedDate", '')), '') IS NOT NULL
    OR EXISTS (
      SELECT 1
      FROM "InvoiceDelivery" AS d
      WHERE d."emailStatus" = 'SENT'
        AND i.id = ANY(d."invoiceIds")
    )
  );

-- A protest date means the year was protested and is still pending a recorded outcome.
UPDATE "Invoice"
SET "protestStatus" = 'PENDING'
WHERE "protestStatus" IS NULL
  AND NULLIF(btrim(COALESCE("protestDate", '')), '') IS NOT NULL;

-- Business personal property is the only type we can infer from existing fee data.
UPDATE "Property" AS p
SET "propertyType" = 'BPP'
WHERE p."propertyType" IS NULL
  AND (
    (
      NULLIF(btrim(COALESCE(p."bppFee", '')), '') IS NOT NULL
      AND btrim(p."bppFee") <> '0'
    )
    OR EXISTS (
      SELECT 1
      FROM "Invoice" AS i
      WHERE i."propertyId" = p.id
        AND NULLIF(btrim(COALESCE(i."bppInvoice", '')), '') IS NOT NULL
        AND btrim(i."bppInvoice") <> '0'
    )
  );
