-- Stored invoice emails keep their own copy of the mail-to address.
-- Move any template that still lists the Kensington office to Hwy 6.
UPDATE "EmailTemplate"
SET
  "bodyHtml" = replace(
    replace(
      "bodyHtml",
      '16107 Kensington Drive, Ste #194',
      '1449 Hwy 6, Ste 330'
    ),
    'Sugar Land, TX 77479',
    'Sugar Land, TX 77478'
  ),
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "bodyHtml" LIKE '%16107 Kensington Drive%';
