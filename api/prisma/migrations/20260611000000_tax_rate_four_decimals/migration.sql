-- Allow tax rate up to 4 decimal places (e.g. 2.3456%)
ALTER TABLE "Invoice" ALTER COLUMN "taxRate" SET DATA TYPE DECIMAL(9,4);
