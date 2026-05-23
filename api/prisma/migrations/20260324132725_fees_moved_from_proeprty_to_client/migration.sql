/*
  Warnings:

  - The `contingencyFee` column on the `Client` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Client" ADD COLUMN     "flatFee" DECIMAL(15,2),
DROP COLUMN "contingencyFee",
ADD COLUMN     "contingencyFee" DECIMAL(10,2);
