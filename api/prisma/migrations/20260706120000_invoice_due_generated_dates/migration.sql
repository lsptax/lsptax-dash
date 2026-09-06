-- Payment due date and invoice generation date (CSV import + edit-property yearly data).
ALTER TABLE "Invoice" ADD COLUMN "dueDate" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "generatedDate" TEXT;
