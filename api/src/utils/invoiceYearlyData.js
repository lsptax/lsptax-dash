import { parseContingencyFeePercent } from "../config/csvColumnMapping.js";

/** Allowed contingency fee override values (percent). */
export const ALLOWED_CONTINGENCY_PERCENTS = [0, 15, 25, 35, 45];

/**
 * Yearly invoice field aliases: camelCase schema key → display labels used by legacy UI.
 */
export const YEARLY_INVOICE_FIELD_ALIASES = {
  protestDate: ["Protest Date"],
  bppRendered: ["BPP Rendered"],
  bppInvoice: ["BPP Invoice"],
  bppPaid: ["BPP Paid"],
  noticeLandValue: ["Notice Land Value"],
  noticeImprovementValue: ["Notice Improvement Value"],
  noticeMarketValue: ["Notice Market Value", "Beginning Market"],
  noticeAppraisedValue: ["Notice Appraised Value", "Beginning Appraised", "Begining Appraised"],
  finalLandValue: ["Final Land Value"],
  finalImprovementValue: ["Final Improvement Value"],
  finalMarketValue: ["Final Market Value", "Ending Market"],
  finalAppraisedValue: ["Final Appraised Value", "Ending Appraised", "Ending Appraised"],
  marketReduction: ["Market Reduction"],
  appraisedReduction: ["Appraised Reduction"],
  hearingDate: ["Hearing Date"],
  invoiceDate: ["Invoice Date"],
  dueDate: ["Due Date"],
  generatedDate: ["Generated Date", "Invoice Generated Date"],
  taxRate: ["Tax Rate", "Overall Tax Rate"],
  taxableSavings: ["Taxable Savings", "Client Tax Savings"],
  contingencyFee: ["Contingency Fee"],
  flatFee: ["Flat Fee"],
  invoiceAmount: ["Invoice Amount", "Due", "Total Fee Due"],
  paidDate: ["Paid Date"],
  isPaid: ["Is Paid", "Paid"],
  paymentNotes: ["Payment Notes"],
  beginningMarket: ["Beginning Market"],
  endingMarket: ["Ending Market"],
  beginningAppraised: ["Beginning Appraised"],
  endingAppraised: ["Ending Appraised"],
};

const NUMERIC_INVOICE_FIELDS = new Set([
  "noticeLandValue",
  "noticeImprovementValue",
  "noticeMarketValue",
  "noticeAppraisedValue",
  "finalLandValue",
  "finalImprovementValue",
  "finalMarketValue",
  "finalAppraisedValue",
  "marketReduction",
  "appraisedReduction",
  "taxRate",
  "taxableSavings",
  "contingencyFee",
  "flatFee",
  "invoiceAmount",
  "beginningMarket",
  "endingMarket",
  "beginningAppraised",
  "endingAppraised",
]);

const BOOLEAN_INVOICE_FIELDS = new Set([
  "underLitigation",
  "underArbitration",
  "isPaid",
]);

/** Auto-calculated fields. Explicit client values win on property invoice save. */
export const DERIVED_INVOICE_FIELDS = new Set([
  "noticeMarketValue",
  "finalMarketValue",
  "marketReduction",
  "appraisedReduction",
  "taxableSavings",
  "invoiceAmount",
]);

/**
 * Derived totals from the sheet that may differ from land + improvement sums.
 * Reductions, tax savings, and invoice amount are always recomputed server-side.
 */
export const INVOICE_EXPLICIT_DERIVED_PRESERVE_FIELDS = new Set([
  "noticeMarketValue",
  "finalMarketValue",
]);

/** Always recomputed — never taken from CSV, API overrides, or stale DB on read. */
export const INVOICE_ALWAYS_RECALCULATED_FIELDS = new Set([
  "marketReduction",
  "appraisedReduction",
  "taxableSavings",
  "invoiceAmount",
]);

/** On API read: preserve only explicit market totals; recalc reductions and amounts. */
const DERIVED_PRESERVE_EXCEPT_INVOICE_AMOUNT = new Set([
  ...INVOICE_EXPLICIT_DERIVED_PRESERVE_FIELDS,
]);

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const US_DATE_RE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

/** Invoice metadata date columns stored as MM/DD/YYYY with zero-padded month/day. */
export const INVOICE_DATE_STRING_FIELDS = new Set([
  "protestDate",
  "hearingDate",
  "invoiceDate",
  "dueDate",
  "generatedDate",
  "paidDate",
]);

function pad2(value) {
  return String(Number(value)).padStart(2, "0");
}

/**
 * Normalize invoice date strings to MM/DD/YYYY (e.g. `7/1/2026` → `07/01/2026`).
 * Accepts M/D/YYYY, MM/DD/YYYY, or ISO YYYY-MM-DD. Unrecognized values pass through unchanged.
 */
export function normalizeInvoiceDateString(value) {
  if (value == null) return "";
  const trimmed = String(value).trim();
  if (trimmed === "") return "";

  const iso = ISO_DATE_RE.exec(trimmed);
  if (iso) {
    const [, year, month, day] = iso;
    return `${pad2(month)}/${pad2(day)}/${year}`;
  }

  const us = US_DATE_RE.exec(trimmed);
  if (us) {
    const [, month, day, year] = us;
    return `${pad2(month)}/${pad2(day)}/${year}`;
  }

  return trimmed;
}

/** Today's date as MM/DD/YYYY in local timezone. */
export function todayInvoiceDateString() {
  const d = new Date();
  return `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}/${d.getFullYear()}`;
}

export function normalizeInvoiceDateFields(invoice) {
  if (!invoice) return {};
  const out = {};
  for (const field of INVOICE_DATE_STRING_FIELDS) {
    const raw = invoice[field];
    if (raw == null || String(raw).trim() === "") continue;
    out[field] = normalizeInvoiceDateString(raw);
  }
  return out;
}

function toSnakeCase(field) {
  return field.replace(/([A-Z])/g, "_$1").toLowerCase();
}

function normalizeYearlyKey(key) {
  return String(key ?? "")
    .trim()
    .toLowerCase()
    .replace(/[%$]/g, "")
    .replace(/[_\s]+/g, " ");
}

function buildYearlyKeyLookup() {
  const lookup = new Map();
  for (const [field, aliases] of Object.entries(YEARLY_INVOICE_FIELD_ALIASES)) {
    lookup.set(normalizeYearlyKey(field), field);
    lookup.set(normalizeYearlyKey(toSnakeCase(field)), field);
    for (const label of aliases) {
      lookup.set(normalizeYearlyKey(label), field);
    }
  }
  return lookup;
}

const YEARLY_KEY_LOOKUP = buildYearlyKeyLookup();

export function normalizeYearlyRow(row) {
  if (row == null || typeof row !== "object" || Array.isArray(row)) return {};
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    const canonical = YEARLY_KEY_LOOKUP.get(normalizeYearlyKey(key));
    if (canonical) out[canonical] = value;
    else out[key] = value;
  }
  return out;
}

export function getYearlyField(data, field) {
  const row = normalizeYearlyRow(data);
  if (!Object.prototype.hasOwnProperty.call(row, field)) return undefined;
  return row[field];
}

export function hasYearlyField(data, field) {
  const row = normalizeYearlyRow(data);
  return Object.prototype.hasOwnProperty.call(row, field);
}

export function normalizeInvoiceForMerge(invoice) {
  if (!invoice) return {};
  const out = { ...invoice };
  for (const key of NUMERIC_INVOICE_FIELDS) {
    if (out[key] != null) out[key] = Number(out[key]);
  }
  return out;
}

export function objectHasInvoiceFields(obj) {
  const row = normalizeYearlyRow(obj);
  return Object.keys(YEARLY_INVOICE_FIELD_ALIASES).some(
    (field) => Object.prototype.hasOwnProperty.call(row, field)
  );
}

export function normalizeYearlyDataInput(yearlyData, { fallbackYear } = {}) {
  if (yearlyData == null) return null;

  if (Array.isArray(yearlyData)) {
    const out = {};
    for (const item of yearlyData) {
      if (item == null || typeof item !== "object") continue;
      const year = item.year ?? item.Year;
      if (year == null || !/^\d{4}$/.test(String(year))) continue;
      const { year: _y, Year: _Y, ...fields } = item;
      out[String(year)] = fields;
    }
    return Object.keys(out).length ? out : null;
  }

  if (typeof yearlyData !== "object") return null;

  const embeddedYear = yearlyData.year ?? yearlyData.Year;
  if (embeddedYear != null && /^\d{4}$/.test(String(embeddedYear))) {
    const { year: _y, Year: _Y, ...fields } = yearlyData;
    return { [String(embeddedYear)]: fields };
  }

  const out = {};
  for (const [year, row] of Object.entries(yearlyData)) {
    if (/^\d{4}$/.test(String(year))) out[String(year)] = row;
  }
  if (Object.keys(out).length) return out;

  if (objectHasInvoiceFields(yearlyData)) {
    const y = fallbackYear ?? new Date().getFullYear();
    return { [String(y)]: yearlyData };
  }

  return null;
}

export function isEmptyYearlyInput(value) {
  if (value === undefined || value === null) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  return false;
}

export function parseOptionalDecimal(value) {
  if (isEmptyYearlyInput(value)) return undefined;
  const clean = String(value).replace(/[$,%\s]/g, "").replace(/,/g, "");
  if (clean === "" || clean === "-") return undefined;
  const n = parseFloat(clean);
  return Number.isFinite(n) ? n : undefined;
}

export function normalizeContingencyPercent(value, clientDefault = 25) {
  if (value === undefined || value === null || value === "") {
    const fallback = Number(clientDefault);
    return Number.isFinite(fallback) ? fallback : 25;
  }
  const parsed = parseContingencyFeePercent(value);
  if (parsed === undefined) {
    const fallback = Number(clientDefault);
    return Number.isFinite(fallback) ? fallback : 25;
  }
  const allowed = ALLOWED_CONTINGENCY_PERCENTS.find((p) => Math.abs(p - parsed) < 0.01);
  return allowed !== undefined ? allowed : parsed;
}

export function roundMoney(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

export function computeNoticeMarketValue(noticeLandValue, noticeImprovementValue) {
  const land = Number(noticeLandValue) || 0;
  const improvement = Number(noticeImprovementValue) || 0;
  return roundMoney(land + improvement);
}

export function computeFinalMarketValue(finalLandValue, finalImprovementValue) {
  const land = Number(finalLandValue) || 0;
  const improvement = Number(finalImprovementValue) || 0;
  return roundMoney(land + improvement);
}

export function computeMarketReduction(noticeMarketValue, finalMarketValue) {
  return roundMoney((Number(noticeMarketValue) || 0) - (Number(finalMarketValue) || 0));
}

export function computeAppraisedReduction(noticeAppraisedValue, finalAppraisedValue) {
  return roundMoney(
    (Number(noticeAppraisedValue) || 0) - (Number(finalAppraisedValue) || 0)
  );
}

export function computeTaxableSavings(appraisedReduction, taxRate) {
  const reduction = Number(appraisedReduction) || 0;
  const rate = Number(taxRate) || 0;
  return roundMoney(reduction * (rate / 100));
}

/** Parse BPP invoice as a dollar amount (ignores legacy ISO date strings). */
export function parseBppInvoiceAmount(value) {
  if (isEmptyYearlyInput(value)) return 0;
  const trimmed = String(value).trim();
  if (ISO_DATE_RE.test(trimmed)) return 0;
  return parseOptionalDecimal(value) ?? 0;
}

export function computeInvoiceAmount(
  taxableSavings,
  contingencyFeePercent,
  bppInvoice,
  flatFee = 0
) {
  const savings = Number(taxableSavings) || 0;
  const pct = Number(contingencyFeePercent) || 0;
  const bppAmount = parseBppInvoiceAmount(bppInvoice);
  const flat = Number(flatFee) || 0;
  return roundMoney(savings * (pct / 100) + bppAmount + flat);
}

/** Total due including BPP invoice amount; always recomputes invoiceAmount from stored inputs. */
export function resolveInvoiceDueAmount(invoice, clientContingencyFee = 25) {
  return applyFullInvoiceCalculations(invoice, clientContingencyFee, {
    preserveDerivedFields: DERIVED_PRESERVE_EXCEPT_INVOICE_AMOUNT,
  }).invoiceAmount;
}

function shouldPreserveDerivedField(preserveDerivedFields, field) {
  if (preserveDerivedFields === true) return true;
  if (preserveDerivedFields instanceof Set) return preserveDerivedFields.has(field);
  if (Array.isArray(preserveDerivedFields)) return preserveDerivedFields.includes(field);
  return false;
}

function chooseCalculatedOrProvided(merged, field, calculated, preserveDerivedFields) {
  if (!shouldPreserveDerivedField(preserveDerivedFields, field)) return calculated;
  const provided = parseOptionalDecimal(merged[field]);
  return provided !== undefined ? provided : calculated;
}

/**
 * Full invoice calculation chain (order matters).
 * Used on save, read enrichment, CSV import, and invoice generate.
 */
export function applyFullInvoiceCalculations(
  invoice,
  clientContingencyFee = 25,
  { preserveDerivedFields = false } = {}
) {
  const merged = normalizeInvoiceForMerge(invoice);

  const rawContingency = merged.contingencyFee;
  // Stored 0 means unset (schema default); explicit 0% is re-applied by CSV/API callers after calc.
  merged.contingencyFee =
    rawContingency != null && rawContingency !== "" && Number(rawContingency) !== 0
      ? normalizeContingencyPercent(rawContingency, clientContingencyFee)
      : normalizeContingencyPercent(null, clientContingencyFee);

  const noticeMarketValue = chooseCalculatedOrProvided(
    merged,
    "noticeMarketValue",
    computeNoticeMarketValue(merged.noticeLandValue, merged.noticeImprovementValue),
    preserveDerivedFields
  );
  const finalMarketValue = chooseCalculatedOrProvided(
    merged,
    "finalMarketValue",
    computeFinalMarketValue(merged.finalLandValue, merged.finalImprovementValue),
    preserveDerivedFields
  );
  const marketReduction = computeMarketReduction(noticeMarketValue, finalMarketValue);
  const appraisedReduction = computeAppraisedReduction(
    merged.noticeAppraisedValue,
    merged.finalAppraisedValue
  );
  const taxableSavings = computeTaxableSavings(appraisedReduction, merged.taxRate);
  const invoiceAmount = computeInvoiceAmount(
    taxableSavings,
    merged.contingencyFee,
    merged.bppInvoice,
    merged.flatFee
  );

  return {
    ...merged,
    noticeMarketValue,
    finalMarketValue,
    marketReduction,
    appraisedReduction,
    taxableSavings,
    invoiceAmount,
  };
}

/** @deprecated Use applyFullInvoiceCalculations */
export function applyInvoiceCalculations(merged, options = {}) {
  if (options.recomputeAll) {
    return applyFullInvoiceCalculations(merged);
  }
  return applyFullInvoiceCalculations(merged);
}

/**
 * Build Prisma invoice patch from yearly row + existing invoice (partial update).
 */
export function buildInvoicePatchFromYearlyData(yearlyRow, existingInvoice, clientContingencyFee) {
  const patch = {};
  const row = normalizeYearlyRow(yearlyRow);
  const existing = normalizeInvoiceForMerge(existingInvoice);
  const explicitDerivedFields = new Set();

  for (const field of Object.keys(YEARLY_INVOICE_FIELD_ALIASES)) {
    if (!Object.prototype.hasOwnProperty.call(row, field)) continue;
    const raw = row[field];
    if (field === "contingencyFee") {
      if (isEmptyYearlyInput(raw)) continue;
      patch.contingencyFee = normalizeContingencyPercent(raw, clientContingencyFee);
    } else if (NUMERIC_INVOICE_FIELDS.has(field)) {
      const parsed = parseOptionalDecimal(raw);
      if (parsed !== undefined) {
        patch[field] = parsed;
        if (
          DERIVED_INVOICE_FIELDS.has(field) &&
          !INVOICE_ALWAYS_RECALCULATED_FIELDS.has(field)
        ) {
          explicitDerivedFields.add(field);
        }
      }
    } else if (!isEmptyYearlyInput(raw)) {
      patch[field] = INVOICE_DATE_STRING_FIELDS.has(field)
        ? normalizeInvoiceDateString(raw)
        : String(raw);
    }
  }

  for (const field of BOOLEAN_INVOICE_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(row, field)) continue;
    const raw = row[field];
    patch[field] = raw === true || String(raw).toLowerCase() === "true";
  }

  // Keep isPaid and paidDate aligned (same rules as PATCH /invoice/payment).
  const hasIsPaid = Object.prototype.hasOwnProperty.call(patch, "isPaid");
  const hasPaidDate = Object.prototype.hasOwnProperty.call(patch, "paidDate");
  if (hasIsPaid) {
    if (patch.isPaid) {
      if (!String(patch.paidDate ?? existing?.paidDate ?? "").trim()) {
        patch.paidDate = todayInvoiceDateString();
      } else if (!hasPaidDate && existing?.paidDate) {
        // Preserve existing paidDate when only isPaid is flipped on.
        patch.paidDate = normalizeInvoiceDateString(existing.paidDate);
      }
    } else {
      patch.paidDate = "";
    }
  } else if (hasPaidDate) {
    patch.isPaid = Boolean(String(patch.paidDate || "").trim());
  }

  const merged = { ...existing, ...patch };
  const calculated = applyFullInvoiceCalculations(merged, clientContingencyFee, {
    preserveDerivedFields: explicitDerivedFields,
  });

  const out = { ...patch };
  for (const field of DERIVED_INVOICE_FIELDS) {
    out[field] = calculated[field];
  }
  if (calculated.contingencyFee != null) {
    out.contingencyFee = calculated.contingencyFee;
  }
  out.invoiceAmount = computeInvoiceAmount(
    out.taxableSavings ?? calculated.taxableSavings,
    out.contingencyFee ?? calculated.contingencyFee,
    out.bppInvoice ?? merged.bppInvoice,
    out.flatFee ?? calculated.flatFee ?? merged.flatFee
  );

  return out;
}

/**
 * Recompute derived invoice fields for DB write / backfill.
 * Preserves stored notice/final market totals when set; always recalculates reductions and amounts.
 */
export function buildRecalculatedInvoicePatch(invoice, clientContingencyFee = 25) {
  const calculated = applyFullInvoiceCalculations(invoice, clientContingencyFee, {
    preserveDerivedFields: INVOICE_EXPLICIT_DERIVED_PRESERVE_FIELDS,
  });
  return {
    noticeMarketValue: calculated.noticeMarketValue,
    finalMarketValue: calculated.finalMarketValue,
    marketReduction: calculated.marketReduction,
    appraisedReduction: calculated.appraisedReduction,
    taxableSavings: calculated.taxableSavings,
    contingencyFee: calculated.contingencyFee,
    invoiceAmount: calculated.invoiceAmount,
  };
}

/** Patch object with only derived numeric fields (for bulk recalc). */
export function derivedInvoicePatch(
  invoice,
  clientContingencyFee = 25,
  { preserveDerivedFields = false } = {}
) {
  const calculated = applyFullInvoiceCalculations(invoice, clientContingencyFee, {
    preserveDerivedFields,
  });
  const out = {};
  for (const field of DERIVED_INVOICE_FIELDS) {
    out[field] = calculated[field];
  }
  out.contingencyFee = calculated.contingencyFee;
  return out;
}

/**
 * API DTO: coerce numerics and apply full calculations for display (even if DB is stale).
 */
export function invoiceToApiDto(invoice, clientContingencyFee = 25) {
  if (!invoice) return invoice;
  const bppInvoiceAmount = parseBppInvoiceAmount(invoice.bppInvoice);
  const calculated = applyFullInvoiceCalculations(invoice, clientContingencyFee, {
    preserveDerivedFields: DERIVED_PRESERVE_EXCEPT_INVOICE_AMOUNT,
  });
  const dto = { ...invoice };
  for (const key of NUMERIC_INVOICE_FIELDS) {
    if (calculated[key] != null) dto[key] = Number(calculated[key]);
  }
  dto.contingencyFeePercent = Number(calculated.contingencyFee);
  dto.bppInvoiceAmount = bppInvoiceAmount;
  return dto;
}
