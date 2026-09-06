import { parse } from "csv-parse/sync";
import prisma from "../../prisma/prismaClient.js";
import { importCSV } from "../utils/csvParser.js";
import { buildClientPropertyCsvAuditReport } from "../utils/clientPropertyCsvAudit.js";
import fs from "fs/promises";
import {
  normalizeRow,
  getClientNumberFromRow,
  getClientDataFromRow,
  getPropertyDataFromRow,
} from "../config/csvColumnMapping.js";
import { propertyImportIdentityKey } from "../utils/propertyImportKey.js";
import {
  computeInvoiceAmount,
  derivedInvoicePatch,
  INVOICE_EXPLICIT_DERIVED_PRESERVE_FIELDS,
  normalizeInvoiceForMerge,
  normalizeInvoiceDateString,
} from "../utils/invoiceYearlyData.js";
import { parseClientFlatFee } from "../config/csvColumnMapping.js";
import {
  buildInvoicePropertyLookupMap,
  findPropertiesForInvoiceCsv,
  pickPropertyForInvoiceRow,
} from "../utils/invoiceAccountLookup.js";
import {
  createCsvImportLogger,
} from "../utils/csvImportLogger.js";

const INVOICE_CSV_PROGRESS_EVERY = 25;

/** Standard CSV error codes returned in API responses */
const CSV_ERROR_CODES = {
  NO_FILE: "CSV_NO_FILE",
  PARSE_ERROR: "CSV_PARSE_ERROR",
  EMPTY: "CSV_EMPTY",
  VALIDATION: "CSV_VALIDATION_ERROR",
  SERVER_ERROR: "CSV_SERVER_ERROR",
};

/**
 * Build a descriptive CSV error response body.
 * @param {string} code - One of CSV_ERROR_CODES
 * @param {string} message - Human-readable summary
 * @param {object} [details] - Optional extra info (errors, line, column, hint, etc.)
 */
function csvErrorResponse(code, message, details = null) {
  const body = { code, message };
  if (details != null) body.details = details;
  return body;
}

/**
 * Turn a csv-parse (or other) exception into a descriptive error response.
 */
function formatCsvParseError(error, contextLabel = "CSV") {
  if (error.code === "CSV_RECORD_INCONSISTENT_COLUMNS") {
    const expected = error.columns?.length ?? 0;
    const actual = error.record?.length ?? 0;
    const line = error.lines ?? error.line ?? null;
    return csvErrorResponse(
      CSV_ERROR_CODES.PARSE_ERROR,
      `Invalid ${contextLabel}: row has ${actual} columns but header has ${expected}. Every row must have the same number of columns as the header.`,
      {
        line,
        expectedColumns: expected,
        actualColumns: actual,
        hint: "Check for missing or extra commas, or unquoted commas inside a field. Quote fields that contain commas.",
      }
    );
  }
  if (error.code === "CSV_INVALID_OPTION" || error.message) {
    return csvErrorResponse(
      CSV_ERROR_CODES.PARSE_ERROR,
      `Could not parse ${contextLabel}: ${error.message}`,
      { hint: "Ensure the file is valid CSV with a header row and consistent columns." }
    );
  }
  return csvErrorResponse(
    CSV_ERROR_CODES.PARSE_ERROR,
    `Could not parse ${contextLabel}: ${error.message || "Unknown error"}`,
    { hint: "Ensure the file is valid CSV with a header row and consistent columns." }
  );
}

/**
 * Parse CSV buffer into records (columns: true).
 * Does not catch; let caller catch and use formatCsvParseError.
 */
function parseCsvBuffer(buffer) {
  return parse(buffer, {
    columns: true,
    trim: true,
    skip_empty_lines: true,
    relax_column_count: true,
  });
}

/**
 * Build client+property map from client/property CSV rows.
 * Column mapping is in config/csvColumnMapping.js.
 */
function buildClientPropertyMap(records) {
  const clientsMap = new Map();
  for (const row of records) {
    const r = normalizeRow(row);
    const clientNumber = getClientNumberFromRow(r);
    if (!clientNumber) continue;

    if (!clientsMap.has(clientNumber)) {
      clientsMap.set(clientNumber, {
        ...getClientDataFromRow(r),
        clientNumber,
        properties: [],
      });
    }

    clientsMap.get(clientNumber).properties.push(
      getPropertyDataFromRow(r, clientNumber)
    );
  }
  return clientsMap;
}

// --- Client + Property ---

/**
 * POST /csv/preview-clients-properties
 * Body: multipart file field "csv"
 * Returns: { summary, newClients, updatedClients, newProperties, updatedProperties, dataQuality }
 * where dataQuality is the same audit as scripts/auditClientPropertyCsv.js (issues, issuesFlat, etc.).
 */
export async function previewClientPropertyCsv(req, res) {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json(
        csvErrorResponse(CSV_ERROR_CODES.NO_FILE, "CSV file is required. Send a multipart request with field name 'csv' and a file.")
      );
    }
    let records;
    try {
      records = parseCsvBuffer(req.file.buffer);
    } catch (parseErr) {
      return res.status(400).json(formatCsvParseError(parseErr, "client/property CSV"));
    }
    if (records.length === 0) {
      return res.status(400).json(
        csvErrorResponse(CSV_ERROR_CODES.EMPTY, "The CSV has no data rows. It must contain a header row and at least one data row.", { hint: "Add data rows below the header." })
      );
    }

    const physicalNewlineCount = req.file.buffer.toString("utf8").split(/\r?\n/).length;
    const dataQuality = buildClientPropertyCsvAuditReport(records, {
      physicalNewlineCount,
      source: req.file.originalname || "(preview upload)",
    });

    const clientsMap = buildClientPropertyMap(records);
    const existingClients = await prisma.client.findMany({
      where: { type: "CLIENT" },
      select: { id: true, clientNumber: true, clientName: true, email: true },
    });
    const existingProperties = await prisma.property.findMany({
      select: {
        id: true,
        accountNumber: true,
        clientNumber: true,
      },
    });
    const existingImportKeys = new Set(
      existingProperties.map((p) => propertyImportIdentityKey(p.clientNumber, p))
    );

    const existingClientNumbers = new Set(existingClients.map((c) => c.clientNumber));

    const newClients = [];
    const updatedClients = [];
    const newProperties = [];
    const updatedProperties = [];

    for (const [clientNumber, data] of clientsMap) {
      const { properties, ...clientInfo } = data;
      const isNewClient = !existingClientNumbers.has(clientNumber);
      if (isNewClient) {
        newClients.push({ clientNumber, clientName: clientInfo.clientName, email: clientInfo.email });
      } else {
        updatedClients.push({ clientNumber, clientName: clientInfo.clientName, email: clientInfo.email });
      }

      for (const prop of properties) {
        const importKey = propertyImportIdentityKey(clientNumber, prop);
        const isNewProp = !existingImportKeys.has(importKey);
        const row = {
          clientNumber,
          accountNumber: prop.accountNumber ?? null,
          nameOnCad: prop.nameOnCad,
          mailingAddress: prop.mailingAddress,
          propertyAddress: prop.propertyAddress,
        };
        if (isNewProp) {
          newProperties.push(row);
        } else {
          updatedProperties.push(row);
        }
      }
    }

    res.status(200).json({
      summary: {
        totalRows: records.length,
        uniqueClientsInCsv: clientsMap.size,
        newClients: newClients.length,
        updatedClients: updatedClients.length,
        newProperties: newProperties.length,
        updatedProperties: updatedProperties.length,
      },
      dataQuality,
      newClients,
      updatedClients,
      newProperties,
      updatedProperties,
    });
  } catch (error) {
    console.error("Error previewing client/property CSV:", error);
    res.status(500).json(
      csvErrorResponse(CSV_ERROR_CODES.SERVER_ERROR, "An error occurred while previewing the client/property CSV.", { error: error.message })
    );
  }
}

/**
 * POST /csv/upload-clients-properties
 * Body: multipart file field "csv"
 * Touches only Client and Property tables.
 */
export async function uploadClientPropertyCsv(req, res) {
  let filePath = null;
  try {
    if (!req.file || !req.file.path) {
      return res.status(400).json(
        csvErrorResponse(CSV_ERROR_CODES.NO_FILE, "CSV file is required. Send a multipart request with field name 'csv' and a file.")
      );
    }
    filePath = req.file.path;
    const stats = await importCSV(filePath);
    res.status(200).json({
      message: "Client and property data imported successfully.",
      stats,
    });
  } catch (error) {
    console.error("Error uploading client/property CSV:", error);
    if (error.code === "CSV_RECORD_INCONSISTENT_COLUMNS" || error.code === "CSV_INVALID_OPTION" || error.message?.includes("column")) {
      return res.status(400).json(formatCsvParseError(error, "client/property CSV"));
    }
    res.status(500).json(
      csvErrorResponse(CSV_ERROR_CODES.SERVER_ERROR, "Failed to import client/property CSV.", { error: error.message })
    );
  } finally {
    if (filePath) {
      try {
        await fs.unlink(filePath);
      } catch (_) { }
    }
  }
}

// --- Invoice ---

const INVOICE_CSV_NUMERIC = [
  "noticeLandValue", "noticeImprovementValue", "noticeMarketValue", "noticeAppraisedValue",
  "finalLandValue", "finalImprovementValue", "finalMarketValue", "finalAppraisedValue",
  "marketReduction", "appraisedReduction", "taxRate", "taxableSavings", "contingencyFee",
  "invoiceAmount", "beginningMarket", "endingMarket", "beginningAppraised", "endingAppraised",
];

const YEAR_REGEX = /^\d{4}$/;

function getYearFromRow(row) {
  const raw = row["year"] ?? row["Year"] ?? "";
  return String(raw).trim();
}

function normalizeHeaderKey(key) {
  return String(key ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function buildNormalizedRow(row) {
  const out = {};
  for (const [k, v] of Object.entries(row || {})) {
    out[normalizeHeaderKey(k)] = v;
  }
  return out;
}

function getByHeaders(row, ...headers) {
  const r = buildNormalizedRow(row);
  for (const h of headers) {
    const key = normalizeHeaderKey(h);
    if (Object.prototype.hasOwnProperty.call(r, key)) return r[key];
  }
  return undefined;
}

function parseMoneyOrNumber(value) {
  if (value === "" || value == null) return 0;
  let s = String(value).trim();
  if (s === "") return 0;

  // Handle accounting negatives like (1,234.56)
  let negative = false;
  if (s.startsWith("(") && s.endsWith(")")) {
    negative = true;
    s = s.slice(1, -1);
  }

  // Remove currency symbols, commas, and whitespace (keep digits, '.', '-')
  s = s.replace(/[$,\s]/g, "");

  // If something like '—' or non-numeric remains, parseFloat will NaN -> 0
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return 0;
  return negative ? -n : n;
}

/**
 * Validate that every invoice CSV row has a non-empty year in YYYY format (4-digit number).
 * Returns { valid: true } or { valid: false, errors: [{ line, message }] }.
 */
function validateInvoiceCsvYears(records) {
  const errors = [];
  for (let i = 0; i < records.length; i++) {
    const line = i + 2; // line 1 is header
    const yearVal = getYearFromRow(records[i]);
    if (yearVal === "") {
      errors.push({ line, message: "year is required and cannot be empty" });
    } else if (!YEAR_REGEX.test(yearVal)) {
      errors.push({ line, message: "year must be a 4-digit number (YYYY), e.g. 2024" });
    }
  }
  return errors.length === 0 ? { valid: true } : { valid: false, errors };
}

function parseInvoiceRow(row) {
  const yearVal = String(getByHeaders(row, "year") ?? "").trim();
  const year = YEAR_REGEX.test(yearVal) ? parseInt(yearVal, 10) : new Date().getFullYear();
  const presentNumericFields = new Set();
  const data = {
    year,
    accountNumber: getByHeaders(row, "accountNumber", "Account Number", "account_number"),
    protestDate: normalizeInvoiceDateString(getByHeaders(row, "protestDate", "Protest Date") ?? ""),
    bppRendered: getByHeaders(row, "bppRendered", "BPP Rendered") ?? "",
    bppInvoice: getByHeaders(row, "bppInvoice", "BPP Invoice") ?? "",
    bppPaid: getByHeaders(row, "bppPaid", "BPP Paid") ?? "",
    hearingDate: normalizeInvoiceDateString(getByHeaders(row, "hearingDate", "Hearing Date") ?? ""),
    invoiceDate: normalizeInvoiceDateString(getByHeaders(row, "invoiceDate", "Invoice Date") ?? ""),
    dueDate: normalizeInvoiceDateString(getByHeaders(row, "dueDate", "Due Date") ?? ""),
    generatedDate: normalizeInvoiceDateString(
      getByHeaders(row, "generatedDate", "Generated Date", "Invoice Generated Date") ?? ""
    ),
    underLitigation:
      String(getByHeaders(row, "underLitigation", "Under Litigation") ?? "").toLowerCase() === "true",
    underArbitration:
      String(getByHeaders(row, "underArbitration", "Under Arbitration") ?? "").toLowerCase() === "true",
    paidDate: normalizeInvoiceDateString(getByHeaders(row, "paidDate", "Paid Date") ?? ""),
    paymentNotes: getByHeaders(row, "paymentNotes", "Payment Notes") ?? "",
    flatFee: parseClientFlatFee(getByHeaders(row, "flatFee", "Flat Fee")) ?? 0,
  };
  for (const key of INVOICE_CSV_NUMERIC) {
    const spaced = key.replace(/([A-Z])/g, " $1").trim();

    // Support year-suffixed headers from spreadsheets like "Final Improvement Value 2024"
    const yearSuffix = ` ${year - 1}`; // common export uses previous year values in the sheet
    const raw = getByHeaders(
      row,
      key,
      spaced,
      `${spaced}${yearSuffix}`,
      `${spaced} ${year}`
    );
    if (raw !== undefined && String(raw).trim() !== "") {
      presentNumericFields.add(key);
    }

    if (key === "contingencyFee") {
      const pct = String(raw ?? "").replace(/%/g, "").replace(/,/g, "").trim();
      data[key] = pct === "" ? 0 : parseMoneyOrNumber(pct);
    } else {
      data[key] = parseMoneyOrNumber(raw);
    }
  }
  data._presentNumericFields = presentNumericFields;
  return data;
}

/** Build Prisma write payload from a parsed invoice CSV row (all CSV values persisted). */
function buildInvoiceCsvUploadData(parsed, existing, prop, clientPct) {
  const numericFields = Object.fromEntries(
    INVOICE_CSV_NUMERIC.map((key) => [key, parsed[key]])
  );

  const payload = {
    propertyId: prop.id,
    accountNumber: prop.accountNumber,
    clientNumber: prop.clientNumber,
    year: parsed.year,
    protestDate: parsed.protestDate,
    bppRendered: parsed.bppRendered,
    bppInvoice: parsed.bppInvoice,
    bppPaid: parsed.bppPaid,
    hearingDate: parsed.hearingDate,
    invoiceDate: parsed.invoiceDate,
    dueDate: parsed.dueDate,
    generatedDate: parsed.generatedDate,
    underLitigation: parsed.underLitigation,
    underArbitration: parsed.underArbitration,
    paidDate: parsed.paidDate,
    isPaid: Boolean(String(parsed.paidDate || "").trim()),
    paymentNotes: parsed.paymentNotes,
    flatFee: parsed.flatFee,
    ...numericFields,
  };

  const csvProvidedDerivedFields = new Set(
    [...(parsed._presentNumericFields ?? [])].filter((field) =>
      INVOICE_EXPLICIT_DERIVED_PRESERVE_FIELDS.has(field)
    )
  );

  const merged = normalizeInvoiceForMerge({ ...existing, ...payload });
  if (
    parsed._presentNumericFields?.has("contingencyFee") &&
    parsed.contingencyFee !== 0
  ) {
    merged.contingencyFee = parsed.contingencyFee;
  }

  const derived = derivedInvoicePatch(merged, clientPct, {
    preserveDerivedFields: csvProvidedDerivedFields,
  });

  const data = { ...payload, ...derived };

  if (
    parsed._presentNumericFields?.has("contingencyFee") &&
    parsed.contingencyFee !== 0
  ) {
    data.contingencyFee = parsed.contingencyFee;
  }

  // Always recompute total due so flat fee is included regardless of tax rate/reduction.
  data.invoiceAmount = computeInvoiceAmount(
    data.taxableSavings,
    data.contingencyFee,
    data.bppInvoice,
    data.flatFee
  );

  return data;
}

function invoiceAccountNumbersFromRecords(records) {
  return records
    .map(
      (r) =>
        r["accountNumber"] ??
        r["Account Number"] ??
        r["account_number"]
    )
    .filter(Boolean);
}

/**
 * POST /csv/preview-invoices
 * Body: multipart file field "csv"
 * CSV columns: year, accountNumber (or propertyId), plus invoice fields.
 * Returns: { newInvoices, updatedInvoices } with counts and preview rows.
 */
export async function previewInvoiceCsv(req, res) {
  const log = createCsvImportLogger("preview-invoices");
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json(
        csvErrorResponse(CSV_ERROR_CODES.NO_FILE, "CSV file is required. Send a multipart request with field name 'csv' and a file.")
      );
    }
    let records;
    try {
      records = parseCsvBuffer(req.file.buffer);
    } catch (parseErr) {
      return res.status(400).json(formatCsvParseError(parseErr, "invoice CSV"));
    }
    if (records.length === 0) {
      return res.status(400).json(
        csvErrorResponse(CSV_ERROR_CODES.EMPTY, "The CSV has no data rows. It must contain a header row and at least one data row.", { hint: "Add data rows below the header." })
      );
    }
    log.phase("parsed CSV", { rows: records.length });

    const yearValidation = validateInvoiceCsvYears(records);
    if (!yearValidation.valid) {
      return res.status(400).json(
        csvErrorResponse(
          CSV_ERROR_CODES.VALIDATION,
          "Invalid year in invoice CSV. Year is required for every row and must be a 4-digit number (YYYY), e.g. 2024.",
          { errors: yearValidation.errors, hint: "Ensure the 'year' column exists and every row has a value like 2024 or 2025." }
        )
      );
    }

    const accountNumbers = [
      ...new Set(invoiceAccountNumbersFromRecords(records).map((a) => String(a).trim())),
    ];
    const properties = await findPropertiesForInvoiceCsv(prisma, accountNumbers);
    const byAccount = buildInvoicePropertyLookupMap(properties);

    const existingInvoices = await prisma.invoice.findMany({
      where: {
        propertyId: { in: properties.map((p) => p.id) },
        year: { in: [...new Set(records.map((r) => parseInt(r["year"] ?? r["Year"], 10) || 0))].filter(Boolean) },
      },
      select: { id: true, propertyId: true, year: true },
    });
    const existingKeys = new Set(existingInvoices.map((i) => `${i.propertyId}-${i.year}`));

    const newInvoices = [];
    const updatedInvoices = [];
    const skipped = [];

    for (const row of records) {
      const parsed = parseInvoiceRow(row);
      const prop = pickPropertyForInvoiceRow(byAccount, parsed.accountNumber);
      if (!prop) {
        skipped.push({ accountNumber: parsed.accountNumber, year: parsed.year, reason: "Property not found" });
        continue;
      }
      const key = `${prop.id}-${parsed.year}`;
      if (existingKeys.has(key)) {
        updatedInvoices.push({
          propertyId: prop.id,
          accountNumber: prop.accountNumber,
          year: parsed.year,
          invoiceAmount: parsed.invoiceAmount,
        });
      } else {
        newInvoices.push({
          propertyId: prop.id,
          accountNumber: prop.accountNumber,
          year: parsed.year,
          invoiceAmount: parsed.invoiceAmount,
        });
      }
    }

    log.complete({
      totalRows: records.length,
      newInvoices: newInvoices.length,
      updatedInvoices: updatedInvoices.length,
      skipped: skipped.length,
    });

    res.status(200).json({
      summary: {
        totalRows: records.length,
        newInvoices: newInvoices.length,
        updatedInvoices: updatedInvoices.length,
        skipped: skipped.length,
      },
      newInvoices,
      updatedInvoices,
      skipped,
    });
  } catch (error) {
    log.error("preview failed", error);
    res.status(500).json(
      csvErrorResponse(CSV_ERROR_CODES.SERVER_ERROR, "An error occurred while previewing the invoice CSV.", { error: error.message })
    );
  }
}

/**
 * POST /csv/upload-invoices
 * Body: multipart file field "csv"
 * Touches only Invoice table (upsert by propertyId + year).
 */
export async function uploadInvoiceCsv(req, res) {
  const log = createCsvImportLogger("upload-invoices");
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json(
        csvErrorResponse(CSV_ERROR_CODES.NO_FILE, "CSV file is required. Send a multipart request with field name 'csv' and a file.")
      );
    }
    let records;
    try {
      records = parseCsvBuffer(req.file.buffer);
    } catch (parseErr) {
      return res.status(400).json(formatCsvParseError(parseErr, "invoice CSV"));
    }
    log.phase("parsed CSV", {
      rows: records.length,
      bytes: req.file.buffer.length,
      filename: req.file.originalname ?? null,
    });

    if (records.length === 0) {
      return res.status(400).json(
        csvErrorResponse(CSV_ERROR_CODES.EMPTY, "The CSV has no data rows. It must contain a header row and at least one data row.", { hint: "Add data rows below the header." })
      );
    }

    const yearValidation = validateInvoiceCsvYears(records);
    if (!yearValidation.valid) {
      return res.status(400).json(
        csvErrorResponse(
          CSV_ERROR_CODES.VALIDATION,
          "Invalid year in invoice CSV. Year is required for every row and must be a 4-digit number (YYYY), e.g. 2024.",
          { errors: yearValidation.errors, hint: "Ensure the 'year' column exists and every row has a value like 2024 or 2025." }
        )
      );
    }

    const accountNumbers = [
      ...new Set(invoiceAccountNumbersFromRecords(records).map((a) => String(a).trim())),
    ];
    const properties = await findPropertiesForInvoiceCsv(prisma, accountNumbers);
    const byAccount = buildInvoicePropertyLookupMap(properties);
    log.phase("resolved properties", {
      csvAccounts: accountNumbers.length,
      matchedProperties: properties.length,
    });

    const years = [
      ...new Set(
        records
          .map((r) => parseInt(getYearFromRow(r), 10))
          .filter((y) => Number.isFinite(y) && y > 0)
      ),
    ];
    const existingInvoices = await prisma.invoice.findMany({
      where: {
        propertyId: { in: properties.map((p) => p.id) },
        year: { in: years },
      },
    });
    const existingByKey = new Map(
      existingInvoices.map((invoice) => [
        `${invoice.propertyId}-${invoice.year}`,
        invoice,
      ])
    );
    log.phase("loaded existing invoices", { count: existingInvoices.length, years });

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const failed = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const line = i + 2;
      const parsed = parseInvoiceRow(row);
      const prop = pickPropertyForInvoiceRow(byAccount, parsed.accountNumber);
      if (!prop) {
        skipped++;
        continue;
      }

      const clientPct =
        prop.client?.contingencyFee != null
          ? Number(prop.client.contingencyFee)
          : 25;

      const key = `${prop.id}-${parsed.year}`;
      const existing = existingByKey.get(key);

      try {
        const data = buildInvoiceCsvUploadData(parsed, existing, prop, clientPct);

        if (existing) {
          await prisma.invoice.update({
            where: { id: existing.id },
            data,
          });
          existingByKey.set(key, { ...existing, ...data });
          updated++;
        } else {
          const saved = await prisma.invoice.create({ data });
          existingByKey.set(key, saved);
          created++;
        }

        const savedCount = created + updated;
        if (savedCount % INVOICE_CSV_PROGRESS_EVERY === 0) {
          log.progress("saved invoices", {
            created,
            updated,
            row: line,
            totalRows: records.length,
          });
        }
      } catch (rowError) {
        failed.push({
          line,
          accountNumber: parsed.accountNumber,
          year: parsed.year,
          message: rowError.message,
        });
        log.error(`row ${line} (${parsed.accountNumber})`, rowError);
      }
    }

    const summary = {
      created,
      updated,
      skipped,
      failed: failed.length,
      totalRows: records.length,
    };
    log.complete(summary);

    const allFailed = created === 0 && updated === 0 && failed.length > 0;
    res.status(allFailed ? 500 : 200).json({
      message: failed.length
        ? `Import finished with ${failed.length} row error(s). Saved rows were kept.`
        : "Invoice data imported successfully.",
      ...summary,
      failedRows: failed.slice(0, 20),
    });
  } catch (error) {
    log.error("upload failed", error);
    res.status(500).json(
      csvErrorResponse(CSV_ERROR_CODES.SERVER_ERROR, "Failed to import invoice CSV.", { error: error.message })
    );
  }
}
