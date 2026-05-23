/*
  Warnings:

  - The `appraisedReduction` column on the `Invoice` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `beginningAppraised` column on the `Invoice` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `beginningMarket` column on the `Invoice` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `contingencyFee` column on the `Invoice` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `endingAppraised` column on the `Invoice` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `endingMarket` column on the `Invoice` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `finalAppraisedValue` column on the `Invoice` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `finalImprovementValue` column on the `Invoice` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `finalLandValue` column on the `Invoice` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `finalMarketValue` column on the `Invoice` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `invoiceAmount` column on the `Invoice` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `marketReduction` column on the `Invoice` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `noticeAppraisedValue` column on the `Invoice` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `noticeImprovementValue` column on the `Invoice` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `noticeLandValue` column on the `Invoice` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `noticeMarketValue` column on the `Invoice` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `taxRate` column on the `Invoice` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `taxableSavings` column on the `Invoice` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Invoice" DROP COLUMN "appraisedReduction",
ADD COLUMN     "appraisedReduction" INTEGER NOT NULL DEFAULT 0,
DROP COLUMN "beginningAppraised",
ADD COLUMN     "beginningAppraised" INTEGER NOT NULL DEFAULT 0,
DROP COLUMN "beginningMarket",
ADD COLUMN     "beginningMarket" INTEGER NOT NULL DEFAULT 0,
DROP COLUMN "contingencyFee",
ADD COLUMN     "contingencyFee" INTEGER NOT NULL DEFAULT 0,
DROP COLUMN "endingAppraised",
ADD COLUMN     "endingAppraised" INTEGER NOT NULL DEFAULT 0,
DROP COLUMN "endingMarket",
ADD COLUMN     "endingMarket" INTEGER NOT NULL DEFAULT 0,
DROP COLUMN "finalAppraisedValue",
ADD COLUMN     "finalAppraisedValue" INTEGER NOT NULL DEFAULT 0,
DROP COLUMN "finalImprovementValue",
ADD COLUMN     "finalImprovementValue" INTEGER NOT NULL DEFAULT 0,
DROP COLUMN "finalLandValue",
ADD COLUMN     "finalLandValue" INTEGER NOT NULL DEFAULT 0,
DROP COLUMN "finalMarketValue",
ADD COLUMN     "finalMarketValue" INTEGER NOT NULL DEFAULT 0,
DROP COLUMN "invoiceAmount",
ADD COLUMN     "invoiceAmount" INTEGER NOT NULL DEFAULT 0,
DROP COLUMN "marketReduction",
ADD COLUMN     "marketReduction" INTEGER NOT NULL DEFAULT 0,
DROP COLUMN "noticeAppraisedValue",
ADD COLUMN     "noticeAppraisedValue" INTEGER NOT NULL DEFAULT 0,
DROP COLUMN "noticeImprovementValue",
ADD COLUMN     "noticeImprovementValue" INTEGER NOT NULL DEFAULT 0,
DROP COLUMN "noticeLandValue",
ADD COLUMN     "noticeLandValue" INTEGER NOT NULL DEFAULT 0,
DROP COLUMN "noticeMarketValue",
ADD COLUMN     "noticeMarketValue" INTEGER NOT NULL DEFAULT 0,
DROP COLUMN "taxRate",
ADD COLUMN     "taxRate" INTEGER NOT NULL DEFAULT 0,
DROP COLUMN "taxableSavings",
ADD COLUMN     "taxableSavings" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ProspectProperty" (
    "id" SERIAL NOT NULL,
    "StatusNotes" TEXT,
    "OtherNotes" TEXT,
    "NAMEONCAD" TEXT,
    "MAILINGADDRESS" TEXT,
    "MAILINGADDRESSCITYTXZIP" TEXT,
    "CADMailingADDRESS" TEXT,
    "CADCITY" TEXT,
    "CADZIPCODE" TEXT,
    "CADCOUNTY" TEXT,
    "AccountNumber" TEXT,
    "CLIENTNumber" TEXT,
    "CONTACTOWNER" TEXT,
    "SUBCONTRACTOWNER" TEXT,
    "BPPFEE" TEXT,
    "CONTINGENCYFee" TEXT,
    "FlatFee" TEXT,
    "AOASigned" TEXT NOT NULL DEFAULT '',
    "HearingDate" TEXT NOT NULL DEFAULT '',
    "IsArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProspectProperty_pkey" PRIMARY KEY ("id")
);
