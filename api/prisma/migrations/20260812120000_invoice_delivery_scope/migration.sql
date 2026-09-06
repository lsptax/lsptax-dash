-- Track which invoices/properties were included in each invoice email send.
ALTER TABLE "InvoiceDelivery"
ADD COLUMN "invoiceIds" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
ADD COLUMN "propertyIds" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[];
