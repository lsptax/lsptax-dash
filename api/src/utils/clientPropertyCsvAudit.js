import {
  normalizeRow,
  getClientNumberFromRow,
  getCol,
  CLIENT_COLUMNS,
  PROPERTY_COLUMNS,
} from "../config/csvColumnMapping.js";

function accountFromRow(r) {
  return getCol(r, ...PROPERTY_COLUMNS.accountNumber);
}

function snapshotFromNormalizedRow(r, dataRecordIndex) {
  const clientId = getClientNumberFromRow(r) || null;
  const accountRaw = accountFromRow(r);
  return {
    dataRecordIndex,
    spreadsheetRow: dataRecordIndex + 2,
    clientId,
    clientName: getCol(r, ...CLIENT_COLUMNS.clientName) ?? null,
    cadName: getCol(r, ...PROPERTY_COLUMNS.nameOnCad) ?? null,
    propertyAddresses: getCol(r, ...PROPERTY_COLUMNS.propertyAddress) ?? null,
    county: getCol(r, ...PROPERTY_COLUMNS.cadCounty) ?? null,
    accountNumber: accountRaw ?? null,
    accountType: getCol(r, ...CLIENT_COLUMNS.typeOfAcct) ?? null,
  };
}

/**
 * Data-quality audit for client+property CSV rows (same rules as import).
 *
 * @param {Record<string, string>[]} records - Parsed rows (raw keys; will be normalized)
 * @param {object} [options]
 * @param {number} [options.physicalNewlineCount] - `buffer.toString().split(/\\r?\\n/).length` when known; defaults to `records.length + 1` (no multiline hint)
 * @param {string|null} [options.source] - e.g. file path or "(preview upload)"
 * @returns {object} Audit report (summary, issues, issuesFlat, dbImportSemantics)
 */
export function buildClientPropertyCsvAuditReport(records, options = {}) {
  const { physicalNewlineCount: physicalOpt, source = null } = options;
  const physicalNewlineCount = physicalOpt ?? records.length + 1;

  const normalizedRows = records.map((row) => normalizeRow(row));

  const missingClientId = [];
  const missingAccountNumber = [];
  const accountToOccurrences = new Map();

  normalizedRows.forEach((r, dataRecordIndex) => {
    const clientId = getClientNumberFromRow(r);
    if (!clientId) {
      missingClientId.push(snapshotFromNormalizedRow(r, dataRecordIndex));
      return;
    }
    const account = accountFromRow(r);
    if (!account) {
      missingAccountNumber.push(snapshotFromNormalizedRow(r, dataRecordIndex));
    }
    const key =
      account != null && String(account).trim() !== "" ? String(account).trim() : "";
    if (!accountToOccurrences.has(key)) accountToOccurrences.set(key, []);
    accountToOccurrences.get(key).push(snapshotFromNormalizedRow(r, dataRecordIndex));
  });

  const duplicateAccounts = [];
  for (const [accountNumber, occurrences] of accountToOccurrences) {
    if (accountNumber === "") continue;
    if (occurrences.length > 1) {
      const sorted = [...occurrences].sort((a, b) => a.dataRecordIndex - b.dataRecordIndex);
      duplicateAccounts.push({
        accountNumber,
        rowCount: sorted.length,
        rows: sorted.map((snap, i) => ({
          ...snap,
          duplicateRole: i === 0 ? "first_row_in_file" : "other_row_same_account_string",
        })),
      });
    }
  }
  duplicateAccounts.sort(
    (a, b) => b.rowCount - a.rowCount || a.accountNumber.localeCompare(b.accountNumber)
  );

  const nonEmptyAccounts = [...accountToOccurrences.keys()].filter((k) => k !== "");
  const uniqueAccountNumbers = nonEmptyAccounts.length;

  const issuesFlat = [
    ...missingClientId.map((r) => ({ issue: "missing_client_id", ...r })),
    ...missingAccountNumber.map((r) => ({ issue: "missing_account_number", ...r })),
  ].sort((a, b) => a.spreadsheetRow - b.spreadsheetRow);

  return {
    generatedAt: new Date().toISOString(),
    source,
    summary: {
      totalDataRows: records.length,
      physicalNewlineCount,
      multilineWarning:
        physicalNewlineCount > records.length + 1
          ? "Some CSV records span multiple physical lines (quoted newlines). spreadsheetRow is logical data order (header = line 1), not always a raw file line."
          : null,
      uniqueNonEmptyAccountNumbers: uniqueAccountNumbers,
      rowsMissingClientId: missingClientId.length,
      rowsMissingAccountNumber: missingAccountNumber.length,
      duplicateAccountNumberGroups: duplicateAccounts.length,
      /** Rows beyond the first in each group that shares the same account number string (informational only). */
      additionalRowsInDuplicateAccountGroups: duplicateAccounts.reduce(
        (n, g) => n + (g.rowCount - 1),
        0
      ),
    },
    issues: {
      missingClientId,
      missingAccountNumber,
      duplicateAccounts,
    },
    issuesFlat,
    dbImportSemantics: {
      accountNumberGloballyUniqueInDb: false,
      importIdempotencyKey: "clientNumber|accountNumber (trimmed)",
      explanation:
        "The same account number may exist on multiple properties (including different clients). " +
        "Re-import skips a row only when that client already has a property with the same account number. " +
        "Invoice CSV rows that match several properties use the lowest property id for that account number.",
    },
  };
}

/**
 * Plain-text report for CLI or logs.
 * @param {object} report - Output of {@link buildClientPropertyCsvAuditReport}
 */
export function formatClientPropertyCsvAuditHumanReadable(report) {
  const lines = [];
  const s = report.summary;
  lines.push("CSV client/property audit");
  lines.push("=======================");
  lines.push(`Source: ${report.source ?? "(unknown)"}`);
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push("");
  lines.push("Summary");
  lines.push("-------");
  lines.push(`Total data rows: ${s.totalDataRows}`);
  lines.push(`Physical newline-separated segments in file: ${s.physicalNewlineCount}`);
  if (s.multilineWarning) lines.push(`Note: ${s.multilineWarning}`);
  lines.push(`Unique non-empty Account Number values: ${s.uniqueNonEmptyAccountNumbers}`);
  lines.push(`Rows missing Client ID (skipped by importer): ${s.rowsMissingClientId}`);
  lines.push(`Rows missing Account Number: ${s.rowsMissingAccountNumber}`);
  lines.push(
    `Account number strings that appear on more than one row (groups): ${s.duplicateAccountNumberGroups}`
  );
  lines.push(
    `Additional rows in those groups (same string, different rows — informational): ${s.additionalRowsInDuplicateAccountGroups}`
  );
  lines.push("");
  lines.push("DB import semantics");
  lines.push("-------------------");
  lines.push(report.dbImportSemantics.explanation);
  lines.push("");

  const printSnapshots = (title, items) => {
    lines.push(title);
    lines.push("-".repeat(Math.min(title.length, 72)));
    if (items.length === 0) {
      lines.push("(none)");
      lines.push("");
      return;
    }
    for (const row of items) {
      lines.push(
        `  spreadsheetRow=${row.spreadsheetRow}  dataRecordIndex=${row.dataRecordIndex}  clientId=${row.clientId}  accountNumber=${JSON.stringify(row.accountNumber)}`
      );
      lines.push(`    clientName: ${row.clientName ?? ""}`);
      lines.push(`    cadName: ${row.cadName ?? ""}`);
      lines.push(`    propertyAddresses: ${row.propertyAddresses ?? ""}`);
      lines.push(`    county: ${row.county ?? ""}  accountType: ${row.accountType ?? ""}`);
      lines.push("");
    }
  };

  printSnapshots("Rows missing Client ID", report.issues.missingClientId);
  printSnapshots("Rows missing Account Number", report.issues.missingAccountNumber);

  lines.push("Duplicate account number strings in file (informational)");
  lines.push("----------------------------------------------------------");
  if (report.issues.duplicateAccounts.length === 0) {
    lines.push("(none)");
  } else {
    for (const g of report.issues.duplicateAccounts) {
      lines.push("");
      lines.push(`Account Number: ${JSON.stringify(g.accountNumber)}  (${g.rowCount} rows)`);
      for (const row of g.rows) {
        lines.push(
          `  [${row.duplicateRole}] spreadsheetRow=${row.spreadsheetRow}  clientId=${row.clientId}  clientName=${row.clientName ?? ""}`
        );
        lines.push(`      cadName: ${row.cadName ?? ""}`);
        lines.push(`      propertyAddresses: ${row.propertyAddresses ?? ""}`);
      }
    }
  }
  lines.push("");
  lines.push("Flat issue index (for scripts)");
  lines.push("-----------------------------");
  lines.push(
    `Issues in issuesFlat (missing client id / missing account only): ${report.issuesFlat.length} — see JSON "issuesFlat".`
  );
  for (const it of report.issuesFlat) {
    lines.push(
      `  spreadsheetRow=${it.spreadsheetRow}  issue=${it.issue}` +
        (it.accountNumber != null ? `  accountNumber=${JSON.stringify(it.accountNumber)}` : "") +
        `  clientId=${it.clientId}`
    );
  }
  lines.push("");
  return lines.join("\n");
}
