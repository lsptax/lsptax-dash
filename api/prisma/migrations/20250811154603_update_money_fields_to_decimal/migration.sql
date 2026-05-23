/*
  Warnings:

  - You are about to alter the column `taxRate` on the `Invoice` table. The data in that column could be lost. The data in that column will be cast from `Integer` to `Decimal(5,2)`.

*/
-- AlterTable
ALTER TABLE "Invoice" ALTER COLUMN "appraisedReduction" SET DEFAULT 0,
ALTER COLUMN "appraisedReduction" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "beginningAppraised" SET DEFAULT 0,
ALTER COLUMN "beginningAppraised" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "beginningMarket" SET DEFAULT 0,
ALTER COLUMN "beginningMarket" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "contingencyFee" SET DEFAULT 0,
ALTER COLUMN "contingencyFee" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "endingAppraised" SET DEFAULT 0,
ALTER COLUMN "endingAppraised" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "endingMarket" SET DEFAULT 0,
ALTER COLUMN "endingMarket" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "finalAppraisedValue" SET DEFAULT 0,
ALTER COLUMN "finalAppraisedValue" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "finalImprovementValue" SET DEFAULT 0,
ALTER COLUMN "finalImprovementValue" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "finalLandValue" SET DEFAULT 0,
ALTER COLUMN "finalLandValue" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "finalMarketValue" SET DEFAULT 0,
ALTER COLUMN "finalMarketValue" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "invoiceAmount" SET DEFAULT 0,
ALTER COLUMN "invoiceAmount" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "marketReduction" SET DEFAULT 0,
ALTER COLUMN "marketReduction" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "noticeAppraisedValue" SET DEFAULT 0,
ALTER COLUMN "noticeAppraisedValue" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "noticeImprovementValue" SET DEFAULT 0,
ALTER COLUMN "noticeImprovementValue" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "noticeLandValue" SET DEFAULT 0,
ALTER COLUMN "noticeLandValue" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "noticeMarketValue" SET DEFAULT 0,
ALTER COLUMN "noticeMarketValue" SET DATA TYPE DECIMAL(15,2),
ALTER COLUMN "taxRate" SET DEFAULT 0,
ALTER COLUMN "taxRate" SET DATA TYPE DECIMAL(5,2),
ALTER COLUMN "taxableSavings" SET DEFAULT 0,
ALTER COLUMN "taxableSavings" SET DATA TYPE DECIMAL(15,2);
