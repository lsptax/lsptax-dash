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
    await importCSV(filePath);
    res.status(200).json({ message: "Client and property data imported successfully." });
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
      } catch (_) {}
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
  const data = {
    year,
    accountNumber: getByHeaders(row, "accountNumber", "Account Number", "account_number"),
    protestDate: getByHeaders(row, "protestDate", "Protest Date") ?? "",
    bppRendered: getByHeaders(row, "bppRendered", "BPP Rendered") ?? "",
    bppInvoice: getByHeaders(row, "bppInvoice", "BPP Invoice") ?? "",
    bppPaid: getByHeaders(row, "bppPaid", "BPP Paid") ?? "",
    hearingDate: getByHeaders(row, "hearingDate", "Hearing Date") ?? "",
    invoiceDate: getByHeaders(row, "invoiceDate", "Invoice Date") ?? "",
    underLitigation:
      String(getByHeaders(row, "underLitigation", "Under Litigation") ?? "").toLowerCase() === "true",
    underArbitration:
      String(getByHeaders(row, "underArbitration", "Under Arbitration") ?? "").toLowerCase() === "true",
    paidDate: getByHeaders(row, "paidDate", "Paid Date") ?? "",
    paymentNotes: getByHeaders(row, "paymentNotes", "Payment Notes") ?? "",
  };
  for (const key of INVOICE_CSV_NUMERIC) {
    const spaced = key.replace(/([A-Z])/g, " $1").trim();

    // Support year-suffixed headers from spreadsheets like "Final Improvement Value 2024"
    const yearSuffix = ` ${year - 1}`; // common export uses previous year values in the sheet
    const raw =
      getByHeaders(
        row,
        key,
        spaced,
        `${spaced}${yearSuffix}`,
        `${spaced} ${year}`
      ) ?? "";

    data[key] = parseMoneyOrNumber(raw);
  }
  return data;
}

/** Multiple properties may share an account number; invoice CSV matches the lowest `property.id` per account. */
function groupPropertiesByAccountNumber(properties) {
  const m = new Map();
  for (const p of properties) {
    if (p.accountNumber == null || String(p.accountNumber).trim() === "") continue;
    const k = String(p.accountNumber).trim();
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(p);
  }
  for (const arr of m.values()) arr.sort((a, b) => a.id - b.id);
  return m;
}

function pickPropertyForInvoiceRow(groups, accountNumber) {
  const raw = accountNumber != null ? String(accountNumber).trim() : "";
  if (raw === "") return null;
  const arr = groups.get(raw);
  if (!arr?.length) return null;
  return arr[0];
}

/**
 * POST /csv/preview-invoices
 * Body: multipart file field "csv"
 * CSV columns: year, accountNumber (or propertyId), plus invoice fields.
 * Returns: { newInvoices, updatedInvoices } with counts and preview rows.
 */
export async function previewInvoiceCsv(req, res) {
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

    const accountNumbers = [...new Set(records.map((r) => r["accountNumber"] ?? r["Account Number"] ?? r["account_number"]).filter(Boolean))];
    const properties = await prisma.property.findMany({
      where: { accountNumber: { in: accountNumbers } },
      select: { id: true, accountNumber: true, clientNumber: true },
    });
    const byAccount = groupPropertiesByAccountNumber(properties);

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

    res.status(200).json({
      summary: {
        totalRows: records.length,
        newInvoices: newInvoices.length,
        updatedInvoices: updatedInvoices.length,
        skipped: skipped.length,
      },
      newInvoices,
      updatedInvoices,
      skipped: skipped.slice(0, 20),
    });
  } catch (error) {
    console.error("Error previewing invoice CSV:", error);
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

    const accountNumbers = [...new Set(records.map((r) => r["accountNumber"] ?? r["Account Number"] ?? r["account_number"]).filter(Boolean))];
    const properties = await prisma.property.findMany({
      where: { accountNumber: { in: accountNumbers } },
      select: { id: true, accountNumber: true, clientNumber: true },
    });
    const byAccount = groupPropertiesByAccountNumber(properties);

    let created = 0;
    let updated = 0;

    for (const row of records) {
      const parsed = parseInvoiceRow(row);
      const prop = pickPropertyForInvoiceRow(byAccount, parsed.accountNumber);
      if (!prop) continue;

      const payload = {
        propertyId: prop.id,
        accountNumber: prop.accountNumber,
        clientNumber: prop.clientNumber,
        year: parsed.year,
        protestDate: parsed.protestDate,
        bppRendered: parsed.bppRendered,
        bppInvoice: parsed.bppInvoice,
        bppPaid: parsed.bppPaid,
        noticeLandValue: parsed.noticeLandValue,
        noticeImprovementValue: parsed.noticeImprovementValue,
        noticeMarketValue: parsed.noticeMarketValue,
        noticeAppraisedValue: parsed.noticeAppraisedValue,
        finalLandValue: parsed.finalLandValue,
        finalImprovementValue: parsed.finalImprovementValue,
        finalMarketValue: parsed.finalMarketValue,
        finalAppraisedValue: parsed.finalAppraisedValue,
        marketReduction: parsed.marketReduction,
        appraisedReduction: parsed.appraisedReduction,
        hearingDate: parsed.hearingDate,
        invoiceDate: parsed.invoiceDate,
        underLitigation: parsed.underLitigation,
        underArbitration: parsed.underArbitration,
        taxRate: parsed.taxRate,
        taxableSavings: parsed.taxableSavings,
        contingencyFee: parsed.contingencyFee,
        invoiceAmount: parsed.invoiceAmount,
        paidDate: parsed.paidDate,
        paymentNotes: parsed.paymentNotes,
        beginningMarket: parsed.beginningMarket,
        endingMarket: parsed.endingMarket,
        beginningAppraised: parsed.beginningAppraised,
        endingAppraised: parsed.endingAppraised,
      };

      const existing = await prisma.invoice.findUnique({
        where: {
          propertyId_year: { propertyId: prop.id, year: parsed.year },
        },
      });

      if (existing) {
        await prisma.invoice.update({
          where: { id: existing.id },
          data: payload,
        });
        updated++;
      } else {
        await prisma.invoice.create({ data: payload });
        created++;
      }
    }

    res.status(200).json({
      message: "Invoice data imported successfully.",
      created,
      updated,
    });
  } catch (error) {
    console.error("Error uploading invoice CSV:", error);
    res.status(500).json(
      csvErrorResponse(CSV_ERROR_CODES.SERVER_ERROR, "Failed to import invoice CSV.", { error: error.message })
    );
  }
}
