-- AlterTable
ALTER TABLE "InvoiceDelivery" ADD COLUMN "storedFiles" JSONB NOT NULL DEFAULT '[]';
