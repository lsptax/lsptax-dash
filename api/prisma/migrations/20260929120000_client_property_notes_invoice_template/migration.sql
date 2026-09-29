-- Client-level notes, property-level notes, and which invoice layout to print.
ALTER TABLE "Client" ADD COLUMN "notes" TEXT;
ALTER TABLE "Property" ADD COLUMN "notes" TEXT;
ALTER TABLE "Invoice" ADD COLUMN "invoiceTemplate" TEXT;
