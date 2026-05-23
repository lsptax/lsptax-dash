/*
  Warnings:

  - You are about to drop the `CsvTable` table. If the table is not empty, all the data it contains will be lost.
  - Made the column `CLIENTNumber` on table `Client` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
CREATE SEQUENCE client_id_seq;
ALTER TABLE "Client" ALTER COLUMN "id" SET DEFAULT nextval('client_id_seq'),
ALTER COLUMN "CLIENTNumber" SET NOT NULL;
ALTER SEQUENCE client_id_seq OWNED BY "Client"."id";

-- DropTable
DROP TABLE "CsvTable";
