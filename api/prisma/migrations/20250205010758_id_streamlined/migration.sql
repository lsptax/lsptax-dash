/*
  Warnings:

  - A unique constraint covering the columns `[CLIENTNumber]` on the table `Client` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Client" ALTER COLUMN "id" DROP DEFAULT;
DROP SEQUENCE "Client_id_seq";

-- CreateIndex
CREATE UNIQUE INDEX "Client_CLIENTNumber_key" ON "Client"("CLIENTNumber");
