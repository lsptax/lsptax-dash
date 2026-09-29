-- Speed up portal search (contains on names, addresses, and account/client numbers).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "Client_clientName_trgm_idx" ON "Client" USING gin ("clientName" gin_trgm_ops);
CREATE INDEX "Client_clientNumber_trgm_idx" ON "Client" USING gin ("clientNumber" gin_trgm_ops);
CREATE INDEX "Client_email_trgm_idx" ON "Client" USING gin ("email" gin_trgm_ops);
CREATE INDEX "Client_phoneNumber_trgm_idx" ON "Client" USING gin ("phoneNumber" gin_trgm_ops);

CREATE INDEX "Property_accountNumber_trgm_idx" ON "Property" USING gin ("accountNumber" gin_trgm_ops);
CREATE INDEX "Property_propertyAddress_trgm_idx" ON "Property" USING gin ("propertyAddress" gin_trgm_ops);
CREATE INDEX "Property_mailingAddress_trgm_idx" ON "Property" USING gin ("mailingAddress" gin_trgm_ops);
CREATE INDEX "Property_clientNumber_trgm_idx" ON "Property" USING gin ("clientNumber" gin_trgm_ops);
CREATE INDEX "Property_nameOnCad_trgm_idx" ON "Property" USING gin ("nameOnCad" gin_trgm_ops);
