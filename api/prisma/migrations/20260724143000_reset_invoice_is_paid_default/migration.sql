-- Intentionally empty.
-- One-time unpaid reset was applied in the environment that needed it.
-- Do not wipe isPaid on deploy — new installs keep the column default (false)
-- and any backfill from 20260724120000_invoice_is_paid.
SELECT 1;
