-- Flat fee lives on Property only. Copy any invoice fee onto a property that
-- does not already have one, then drop the invoice column.
UPDATE "Property" p
SET "flatFee" = fee.amount
FROM (
  SELECT DISTINCT ON (i."propertyId")
    i."propertyId",
    trim(to_char(i."flatFee", '999999990.00')) AS amount
  FROM "Invoice" i
  WHERE i."flatFee" > 0
  ORDER BY i."propertyId", i.year DESC
) fee
WHERE p.id = fee."propertyId"
  AND (
    p."flatFee" IS NULL
    OR btrim(p."flatFee") = ''
    OR btrim(p."flatFee") IN ('0', '0.0', '0.00')
  );

ALTER TABLE "Invoice" DROP COLUMN IF EXISTS "flatFee";
