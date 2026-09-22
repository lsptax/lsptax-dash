-- Template purpose and built-in flag. Copy stays out of this migration.
ALTER TABLE "EmailTemplate" ADD COLUMN "purpose" TEXT NOT NULL DEFAULT 'invoice';
ALTER TABLE "EmailTemplate" ADD COLUMN "isBuiltin" BOOLEAN NOT NULL DEFAULT false;

UPDATE "EmailTemplate"
SET "purpose" = 'invoice', "isBuiltin" = true
WHERE "key" = 'invoice_delivery';

UPDATE "EmailTemplate"
SET "purpose" = 'payment_acknowledgement', "isBuiltin" = true
WHERE "key" = 'payment_acknowledgement';

ALTER TABLE "EmailTemplate" ALTER COLUMN "purpose" DROP DEFAULT;
ALTER TABLE "EmailTemplate" ALTER COLUMN "isBuiltin" DROP DEFAULT;
