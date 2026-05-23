-- CreateIndex
CREATE INDEX "Client_IsArchived_id_idx" ON "Client"("IsArchived", "id");

-- CreateIndex
CREATE INDEX "CsvTable_IsArchived_idx" ON "CsvTable"("IsArchived");

-- CreateIndex
CREATE INDEX "CsvTable_CLIENTNumber_idx" ON "CsvTable"("CLIENTNumber");

-- CreateIndex
CREATE INDEX "Invoice_CLIENTNumber_idx" ON "Invoice"("CLIENTNumber");

-- CreateIndex
CREATE INDEX "Invoice_AccountNumber_idx" ON "Invoice"("AccountNumber");

-- CreateIndex
CREATE INDEX "Invoice_year_idx" ON "Invoice"("year");

-- CreateIndex
CREATE INDEX "Invoice_IsArchived_idx" ON "Invoice"("IsArchived");

-- CreateIndex
CREATE INDEX "Property_IsArchived_CLIENTNumber_idx" ON "Property"("IsArchived", "CLIENTNumber");

-- CreateIndex
CREATE INDEX "Prospect_status_idx" ON "Prospect"("status");

-- CreateIndex
CREATE INDEX "Prospect_IsArchived_idx" ON "Prospect"("IsArchived");

-- CreateIndex
CREATE INDEX "ProspectProperty_IsArchived_CLIENTNumber_idx" ON "ProspectProperty"("IsArchived", "CLIENTNumber");
