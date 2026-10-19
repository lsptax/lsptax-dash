-- How a paid invoice was settled: Zelle, cash, check, credit card, or others.

CREATE TYPE "PaymentMethod" AS ENUM ('ZELLE', 'CASH', 'CHECK', 'CREDIT_CARD', 'OTHER');

ALTER TABLE "Invoice" ADD COLUMN "paymentMethod" "PaymentMethod";

CREATE INDEX "Invoice_paymentMethod_idx" ON "Invoice"("paymentMethod");
