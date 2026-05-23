/*
  Warnings:

  - You are about to drop the column `contingencyFee` on the `Client` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Client" DROP COLUMN "contingencyFee";

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "contingencyFee" TEXT;
