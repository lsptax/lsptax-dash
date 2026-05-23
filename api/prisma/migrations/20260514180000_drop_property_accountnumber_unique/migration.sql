-- Drop global uniqueness on Property.accountNumber so multiple properties may share the same CAD/account string.
DROP INDEX IF EXISTS "Property_accountNumber_key";
