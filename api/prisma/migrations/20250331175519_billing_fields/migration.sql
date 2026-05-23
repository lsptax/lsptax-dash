-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "BillingAddress" TEXT,
ADD COLUMN     "BillingEmail" TEXT,
ADD COLUMN     "envelopeId" TEXT;

-- AlterTable
ALTER TABLE "Prospect" ADD COLUMN     "BillingAddress" TEXT,
ADD COLUMN     "BillingEmail" TEXT,
ADD COLUMN     "TypeOfAcct" TEXT;
