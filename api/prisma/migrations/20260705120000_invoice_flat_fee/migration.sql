-- Per-year flat fee on invoice rows (used by invoice CSV import and edit-property yearly data).
ALTER TABLE "Invoice" ADD COLUMN "flatFee" DECIMAL(15,2) NOT NULL DEFAULT 0;
