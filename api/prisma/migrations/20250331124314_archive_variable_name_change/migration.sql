/*
  Warnings:

  - You are about to drop the column `isArchived` on the `Invoice` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Invoice" DROP COLUMN "isArchived",
ADD COLUMN     "IsArchived" BOOLEAN NOT NULL DEFAULT false;
