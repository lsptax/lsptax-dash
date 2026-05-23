/*
  Warnings:

  - Added the required column `updatedAt` to the `Contract` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'SENT', 'COMPLETED', 'DECLINED', 'VOIDED');

-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "signedFileUrl" TEXT,
ADD COLUMN     "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "fileUrl" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Contract_envelopeId_idx" ON "Contract"("envelopeId");

-- CreateIndex
CREATE INDEX "Contract_status_idx" ON "Contract"("status");
