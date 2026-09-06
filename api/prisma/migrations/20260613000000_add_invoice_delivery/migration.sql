-- CreateTable
CREATE TABLE "InvoiceDelivery" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "year" INTEGER,
    "recipientEmail" TEXT NOT NULL,
    "recipientPhone" TEXT,
    "emailStatus" TEXT NOT NULL,
    "smsStatus" TEXT,
    "emailSentAt" TIMESTAMP(3),
    "smsSentAt" TIMESTAMP(3),
    "brevoEmailMessageId" TEXT,
    "attachmentNames" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvoiceDelivery_clientId_idx" ON "InvoiceDelivery"("clientId");

-- CreateIndex
CREATE INDEX "InvoiceDelivery_createdAt_idx" ON "InvoiceDelivery"("createdAt");

-- AddForeignKey
ALTER TABLE "InvoiceDelivery" ADD CONSTRAINT "InvoiceDelivery_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
