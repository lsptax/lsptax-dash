/*
  Warnings:

  - You are about to drop the column `BillingAddress` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `BillingEmail` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `CLIENTNAME` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `CLIENTNumber` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `Email` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `IsArchived` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `MAILINGADDRESS` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `MAILINGADDRESSCITYTXZIP` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `NAMEONCAD` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `PHONENUMBER` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `TypeOfAcct` on the `Client` table. All the data in the column will be lost.
  - You are about to drop the column `AccountNumber` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `CLIENTNumber` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `IsArchived` on the `Invoice` table. All the data in the column will be lost.
  - You are about to drop the column `AOASigned` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `AccountNumber` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `BPPFEE` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `CADCITY` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `CADCOUNTY` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `CADMailingADDRESS` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `CADZIPCODE` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `CLIENTNumber` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `CONTACTOWNER` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `CONTINGENCYFee` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `FlatFee` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `HearingDate` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `IsArchived` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `MAILINGADDRESS` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `MAILINGADDRESSCITYTXZIP` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `NAMEONCAD` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `OtherNotes` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `SUBCONTRACTOWNER` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `StatusNotes` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the `Prospect` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProspectProperty` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[clientNumber]` on the table `Client` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[propertyId,year]` on the table `Invoice` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[accountNumber]` on the table `Property` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `type` to the `Client` table without a default value. This is not possible if the table is not empty.
  - Added the required column `propertyId` to the `Invoice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `clientId` to the `Property` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('PROSPECT', 'CLIENT');

-- CreateEnum
CREATE TYPE "ClientProspectStatus" AS ENUM ('NOT_CONTACTED', 'CONTACTED', 'FORM_SENT');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('CLIENT_CONTRACT', 'AOA');

-- DropIndex
DROP INDEX "Client_CLIENTNumber_key";

-- DropIndex
DROP INDEX "Client_IsArchived_id_idx";

-- DropIndex
DROP INDEX "Invoice_AccountNumber_idx";

-- DropIndex
DROP INDEX "Invoice_CLIENTNumber_idx";

-- DropIndex
DROP INDEX "Invoice_IsArchived_idx";

-- DropIndex
DROP INDEX "Property_IsArchived_CLIENTNumber_idx";

-- AlterTable
ALTER TABLE "Client" DROP COLUMN "BillingAddress",
DROP COLUMN "BillingEmail",
DROP COLUMN "CLIENTNAME",
DROP COLUMN "CLIENTNumber",
DROP COLUMN "Email",
DROP COLUMN "IsArchived",
DROP COLUMN "MAILINGADDRESS",
DROP COLUMN "MAILINGADDRESSCITYTXZIP",
DROP COLUMN "NAMEONCAD",
DROP COLUMN "PHONENUMBER",
DROP COLUMN "TypeOfAcct",
ADD COLUMN     "billingAddress" TEXT,
ADD COLUMN     "billingEmail" TEXT,
ADD COLUMN     "clientName" TEXT,
ADD COLUMN     "clientNumber" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mailingAddress" TEXT,
ADD COLUMN     "mailingAddressCityTxZip" TEXT,
ADD COLUMN     "nameOnCad" TEXT,
ADD COLUMN     "phoneNumber" TEXT,
ADD COLUMN     "prospectStatus" "ClientProspectStatus",
ADD COLUMN     "type" "ClientType" NOT NULL,
ADD COLUMN     "typeOfAcct" TEXT;

-- AlterTable
ALTER TABLE "Invoice" DROP COLUMN "AccountNumber",
DROP COLUMN "CLIENTNumber",
DROP COLUMN "IsArchived",
ADD COLUMN     "accountNumber" TEXT,
ADD COLUMN     "clientNumber" TEXT,
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "propertyId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Property" DROP COLUMN "AOASigned",
DROP COLUMN "AccountNumber",
DROP COLUMN "BPPFEE",
DROP COLUMN "CADCITY",
DROP COLUMN "CADCOUNTY",
DROP COLUMN "CADMailingADDRESS",
DROP COLUMN "CADZIPCODE",
DROP COLUMN "CLIENTNumber",
DROP COLUMN "CONTACTOWNER",
DROP COLUMN "CONTINGENCYFee",
DROP COLUMN "FlatFee",
DROP COLUMN "HearingDate",
DROP COLUMN "IsArchived",
DROP COLUMN "MAILINGADDRESS",
DROP COLUMN "MAILINGADDRESSCITYTXZIP",
DROP COLUMN "NAMEONCAD",
DROP COLUMN "OtherNotes",
DROP COLUMN "SUBCONTRACTOWNER",
DROP COLUMN "StatusNotes",
ADD COLUMN     "accountNumber" TEXT,
ADD COLUMN     "aoaSigned" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "bppFee" TEXT,
ADD COLUMN     "cadCity" TEXT,
ADD COLUMN     "cadCounty" TEXT,
ADD COLUMN     "cadMailingAddress" TEXT,
ADD COLUMN     "cadZipCode" TEXT,
ADD COLUMN     "clientId" INTEGER NOT NULL,
ADD COLUMN     "clientNumber" TEXT,
ADD COLUMN     "contactOwner" TEXT,
ADD COLUMN     "contingencyFee" TEXT,
ADD COLUMN     "flatFee" TEXT,
ADD COLUMN     "hearingDate" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "isArchived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mailingAddress" TEXT,
ADD COLUMN     "mailingAddressCityTxZip" TEXT,
ADD COLUMN     "nameOnCad" TEXT,
ADD COLUMN     "otherNotes" TEXT,
ADD COLUMN     "statusNotes" TEXT,
ADD COLUMN     "subcontractOwner" TEXT;

-- DropTable
DROP TABLE "Prospect";

-- DropTable
DROP TABLE "ProspectProperty";

-- DropEnum
DROP TYPE "ProspectStatus";

-- CreateTable
CREATE TABLE "Contract" (
    "id" SERIAL NOT NULL,
    "type" "ContractType" NOT NULL,
    "clientId" INTEGER NOT NULL,
    "propertyId" INTEGER,
    "fileUrl" TEXT NOT NULL,
    "envelopeId" TEXT,
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Contract_clientId_idx" ON "Contract"("clientId");

-- CreateIndex
CREATE INDEX "Contract_propertyId_idx" ON "Contract"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "Client_clientNumber_key" ON "Client"("clientNumber");

-- CreateIndex
CREATE INDEX "Client_clientName_idx" ON "Client"("clientName");

-- CreateIndex
CREATE INDEX "Client_email_idx" ON "Client"("email");

-- CreateIndex
CREATE INDEX "Client_phoneNumber_idx" ON "Client"("phoneNumber");

-- CreateIndex
CREATE INDEX "Client_type_idx" ON "Client"("type");

-- CreateIndex
CREATE INDEX "Invoice_propertyId_idx" ON "Invoice"("propertyId");

-- CreateIndex
CREATE INDEX "Invoice_isArchived_idx" ON "Invoice"("isArchived");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_propertyId_year_key" ON "Invoice"("propertyId", "year");

-- CreateIndex
CREATE UNIQUE INDEX "Property_accountNumber_key" ON "Property"("accountNumber");

-- CreateIndex
CREATE INDEX "Property_clientId_idx" ON "Property"("clientId");

-- CreateIndex
CREATE INDEX "Property_isArchived_clientNumber_idx" ON "Property"("isArchived", "clientNumber");

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
