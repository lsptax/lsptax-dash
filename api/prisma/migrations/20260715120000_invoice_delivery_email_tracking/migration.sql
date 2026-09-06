-- AlterTable
ALTER TABLE "InvoiceDelivery" ADD COLUMN "emailLastEvent" TEXT;
ALTER TABLE "InvoiceDelivery" ADD COLUMN "emailDeliveredAt" TIMESTAMP(3);
ALTER TABLE "InvoiceDelivery" ADD COLUMN "emailOpenedAt" TIMESTAMP(3);
ALTER TABLE "InvoiceDelivery" ADD COLUMN "emailBounceReason" TEXT;

-- CreateIndex
CREATE INDEX "InvoiceDelivery_brevoEmailMessageId_idx" ON "InvoiceDelivery"("brevoEmailMessageId");
