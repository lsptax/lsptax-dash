/*
  Warnings:

  - You are about to drop the column `ARBFee` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `ARBInvoice` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `AnyRandamServiceInvoice` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `ArbitrationAppraisedValueReduction` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `ArbitrationContingencyFee` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `ArbitrationDue` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `ArbitrationFinalAppraisedTotal` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `ArbitrationOverallTaxRate` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `BPPInvoice` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `BPPInvoicePaid` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `BPPThisYearAppraised` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `ClientPaidOrArbRefundUsed` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `CollectOrRefund` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `ComptrollerRefundCK` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `Contingency` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `ContingencyFeeDue` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `FinalAppraisedValue` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `FinalMarketValue` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `IsArchived` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `JustBPPBPPLastYearAppraised` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `LastYearAppraised` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `MarketValueReduction` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `NoticeAppraisedTotal` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `NoticeAppraisedValue` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `NoticeMarketValue` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `ONLYMarketChangeInARB` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `PastDue` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `PastDuePaid` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `ProtestInvoice` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `ProtestInvoicePaid` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `RandomServiceFeeInvoicePaid` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `TaxBPPAppraisedValueReduction` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `TaxBPPBPPLastYearAppraised` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `TaxBPPContingencyFee` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `TaxBPPDue` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `TaxBPPFinalAppraisedTotal` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `TaxBPPOverallTaxRate` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `TaxBPPTaxSavings` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `TaxSavings` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `TotalDue` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `TypeOfService` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `Value2525AppraisedValueReduction` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `Value2525ContingencyFee` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `Value2525Due` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `Value2525FinalAppraisedTotal` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `Value2525OverallTaxRate` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `Value2525TaxSavings` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `ValueAppraisedValueReduction` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `ValueOverallTaxRate` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `ValueTaxSavings` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `protestedDate` on the `Invoice` table. All the data in the column will be lost.
  - Made the column `underArbitration` on table `Invoice` required. This step will fail if there are existing NULL values in that column.
  - Made the column `underLitigation` on table `Invoice` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Invoice" DROP COLUMN "ARBFee",
DROP COLUMN "ARBInvoice",
DROP COLUMN "AnyRandamServiceInvoice",
DROP COLUMN "ArbitrationAppraisedValueReduction",
DROP COLUMN "ArbitrationContingencyFee",
DROP COLUMN "ArbitrationDue",
DROP COLUMN "ArbitrationFinalAppraisedTotal",
DROP COLUMN "ArbitrationOverallTaxRate",
DROP COLUMN "BPPInvoice",
DROP COLUMN "BPPInvoicePaid",
DROP COLUMN "BPPThisYearAppraised",
DROP COLUMN "ClientPaidOrArbRefundUsed",
DROP COLUMN "CollectOrRefund",
DROP COLUMN "ComptrollerRefundCK",
DROP COLUMN "Contingency",
DROP COLUMN "ContingencyFeeDue",
DROP COLUMN "FinalAppraisedValue",
DROP COLUMN "FinalMarketValue",
DROP COLUMN "IsArchived",
DROP COLUMN "JustBPPBPPLastYearAppraised",
DROP COLUMN "LastYearAppraised",
DROP COLUMN "MarketValueReduction",
DROP COLUMN "NoticeAppraisedTotal",
DROP COLUMN "NoticeAppraisedValue",
DROP COLUMN "NoticeMarketValue",
DROP COLUMN "ONLYMarketChangeInARB",
DROP COLUMN "PastDue",
DROP COLUMN "PastDuePaid",
DROP COLUMN "ProtestInvoice",
DROP COLUMN "ProtestInvoicePaid",
DROP COLUMN "RandomServiceFeeInvoicePaid",
DROP COLUMN "TaxBPPAppraisedValueReduction",
DROP COLUMN "TaxBPPBPPLastYearAppraised",
DROP COLUMN "TaxBPPContingencyFee",
DROP COLUMN "TaxBPPDue",
DROP COLUMN "TaxBPPFinalAppraisedTotal",
DROP COLUMN "TaxBPPOverallTaxRate",
DROP COLUMN "TaxBPPTaxSavings",
DROP COLUMN "TaxSavings",
DROP COLUMN "TotalDue",
DROP COLUMN "TypeOfService",
DROP COLUMN "Value2525AppraisedValueReduction",
DROP COLUMN "Value2525ContingencyFee",
DROP COLUMN "Value2525Due",
DROP COLUMN "Value2525FinalAppraisedTotal",
DROP COLUMN "Value2525OverallTaxRate",
DROP COLUMN "Value2525TaxSavings",
DROP COLUMN "ValueAppraisedValueReduction",
DROP COLUMN "ValueOverallTaxRate",
DROP COLUMN "ValueTaxSavings",
DROP COLUMN "protestedDate",
ADD COLUMN     "appraisedReduction" TEXT,
ADD COLUMN     "beginningAppraised" TEXT,
ADD COLUMN     "beginningMarket" TEXT,
ADD COLUMN     "bppInvoice" TEXT,
ADD COLUMN     "bppPaid" TEXT,
ADD COLUMN     "bppRendered" TEXT,
ADD COLUMN     "contingencyFee" TEXT,
ADD COLUMN     "endingAppraised" TEXT,
ADD COLUMN     "endingMarket" TEXT,
ADD COLUMN     "finalAppraisedValue" TEXT,
ADD COLUMN     "finalImprovementValue" TEXT,
ADD COLUMN     "finalLandValue" TEXT,
ADD COLUMN     "finalMarketValue" TEXT,
ADD COLUMN     "invoiceAmount" TEXT,
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "marketReduction" TEXT,
ADD COLUMN     "noticeAppraisedValue" TEXT,
ADD COLUMN     "noticeImprovementValue" TEXT,
ADD COLUMN     "noticeLandValue" TEXT,
ADD COLUMN     "noticeMarketValue" TEXT,
ADD COLUMN     "protestDate" TEXT,
ADD COLUMN     "taxRate" TEXT,
ADD COLUMN     "taxableSavings" TEXT,
ALTER COLUMN "underArbitration" SET NOT NULL,
ALTER COLUMN "underLitigation" SET NOT NULL;
