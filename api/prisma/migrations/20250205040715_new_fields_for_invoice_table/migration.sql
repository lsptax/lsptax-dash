-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "hearingDate" TEXT,
ADD COLUMN     "invoiceDate" TEXT,
ADD COLUMN     "paidDate" TEXT,
ADD COLUMN     "paymentNotes" TEXT,
ADD COLUMN     "protestedDate" TEXT,
ADD COLUMN     "underArbitration" BOOLEAN DEFAULT false,
ADD COLUMN     "underLitigation" BOOLEAN DEFAULT false;
