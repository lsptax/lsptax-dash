/**
 * CSV column name mapping for Client + Property import.
 * Edit this file when your CSV headers change or you add new column variants.
 *
 * Each key is the schema/API field name; the value is an array of possible
 * CSV header names (first match wins). Headers are matched after normalizing
 * (newlines and multiple spaces collapsed to single space).
 */

/** Possible CSV column names for each Client field (order = priority) */
export const CLIENT_COLUMNS = {
  clientNumber: ["Client ID", "CLIENT #", "CLIENT  Number #"],
  clientName: ["Client Name", "CLIENT Name", "CLIENT NAME"],
  typeOfAcct: ["Account Type", "Type of Acct"],
  email: ["Email Address", "Email"],
  billingEmail: ["Email Address", "Email"],
  billingAddress: ["Billing Address", "Mailing Address", "MAILING ADDRESS"],
  phoneNumber: ["Contact Number", "PHONE NUMBER"],
  nameOnCad: ["CAD Name", "NAME ON CAD"],
  mailingAddress: ["Mailing Address", "MAILING ADDRESS"],
  mailingAddressCityTxZip: [
    "City, Zip Code",
    "CITY, TX ZIP",
    "MAILING ADDRESS CITY, TX ZIP",
  ],
  contingencyFee: [
    "Contingency Fee Due",
    "Contingency Fee Due:",
    "Contingency Fee",
    "CONTINGENCY Fee",
  ],
  flatFee: ["Flat Fee"],
};

/** Possible CSV column names for each Property field (order = priority) */
export const PROPERTY_COLUMNS = {
  accountNumber: ["Account Number"],
  nameOnCad: ["CAD Name", "NAME ON CAD"],
  mailingAddress: ["Mailing Address", "MAILING ADDRESS"],
  mailingAddressCityTxZip: [
    "City, Zip Code",
    "CITY, TX ZIP",
    "MAILING ADDRESS CITY, TX ZIP",
  ],
  propertyAddress: [
    "Property Addresses",
    "PROPERTY ADDRESSES",
    "Physical or Situs Address of Property",
  ],
  cadMailingAddress: [
    "Property Address",
    "PROPERTY ADDRESS",
    "CAD Mailing ADDRESS",
  ],
  cadCity: ["City", "CITY", "CAD CITY"],
  cadZipCode: ["ZIP CODE", "CAD ZIP CODE"],
  cadCounty: ["County", "COUNTY", "CAD COUNTY"],
  bppFee: ["BPP FEE"],
  flatFee: ["Flat Fee"],
};

// --- Helpers (used by controller and csvParser) ---

/**
 * Normalize row keys: collapse newlines and multiple spaces to single space, trim.
 * e.g. "Contact \nNumber" → "Contact Number"
 */
export function normalizeRow(row) {
  const out = {};
  for (const [key, value] of Object.entries(row)) {
    const cleanKey = key.replace(/\s+/g, " ").trim();
    out[cleanKey] = value;
  }
  return out;
}

/** Get first non-empty value from row for given column names */
export function getCol(row, ...keys) {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && String(v).trim() !== "")
      return String(v).trim();
  }
  return undefined;
}

/** Read a value from normalized row using a mapping of schema field → column names */
function getMapped(row, columnList) {
  return getCol(row, ...columnList);
}

/**
 * Parse contingency percent from CSV/API string; returns a number for DB (no % stored).
 * e.g. "25%", " 30 " → 25, 30. Invalid / empty → undefined.
 */
export function parseContingencyFeePercent(value) {
  if (value == null || value === "") return undefined;
  const cleaned = String(value).replace(/%/g, "").replace(/,/g, "").trim();
  if (cleaned === "") return undefined;
  const n = parseFloat(cleaned);
  return Number.isNaN(n) ? undefined : n;
}

/**
 * Parse client flat fee from CSV/API string; returns a number for DB (no $ stored).
 */
export function parseClientFlatFee(value) {
  if (value == null || value === "") return undefined;
  const cleaned = String(value).replace(/[$,\s]/g, "").replace(/%/g, "").trim();
  if (cleaned === "") return undefined;
  const n = parseFloat(cleaned);
  return Number.isNaN(n) ? undefined : n;
}

/**
 * Mutates `data`: if `contingencyFee` / `flatFee` keys exist, coerce to numeric DB values or null.
 * Use before Prisma create/update for Client (and PROSPECT rows).
 */
export function normalizeClientFeeFieldsForWrite(data) {
  if (data == null) return data;
  if (Object.prototype.hasOwnProperty.call(data, "contingencyFee")) {
    const v = data.contingencyFee;
    data.contingencyFee =
      v === null || v === ""
        ? null
        : parseContingencyFeePercent(v) ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(data, "flatFee")) {
    const v = data.flatFee;
    data.flatFee =
      v === null || v === "" ? null : parseClientFlatFee(v) ?? null;
  }
  return data;
}

/**
 * Extract client data from a normalized CSV row (for Client table).
 * Does not include clientNumber; caller adds it from getCol(row, ...CLIENT_COLUMNS.clientNumber).
 */
export function getClientDataFromRow(normalizedRow) {
  const r = normalizedRow;
  return {
    type: "CLIENT",
    typeOfAcct: getMapped(r, CLIENT_COLUMNS.typeOfAcct),
    clientName: getMapped(r, CLIENT_COLUMNS.clientName),
    email: getMapped(r, CLIENT_COLUMNS.email),
    billingEmail: getMapped(r, CLIENT_COLUMNS.billingEmail),
    billingAddress: getMapped(r, CLIENT_COLUMNS.billingAddress),
    phoneNumber: getMapped(r, CLIENT_COLUMNS.phoneNumber),
    nameOnCad: getMapped(r, CLIENT_COLUMNS.nameOnCad),
    mailingAddress: getMapped(r, CLIENT_COLUMNS.mailingAddress),
    mailingAddressCityTxZip: getMapped(r, CLIENT_COLUMNS.mailingAddressCityTxZip),
    contingencyFee: parseContingencyFeePercent(getMapped(r, CLIENT_COLUMNS.contingencyFee)),
    flatFee: parseClientFlatFee(getMapped(r, CLIENT_COLUMNS.flatFee)),
  };
}

/**
 * Extract property data from a normalized CSV row (for Property table).
 */
export function getPropertyDataFromRow(normalizedRow, clientNumber) {
  const r = normalizedRow;
  const accountNumber = getMapped(r, PROPERTY_COLUMNS.accountNumber);
  return {
    nameOnCad: getMapped(r, PROPERTY_COLUMNS.nameOnCad),
    mailingAddress: getMapped(r, PROPERTY_COLUMNS.mailingAddress),
    mailingAddressCityTxZip: getMapped(r, PROPERTY_COLUMNS.mailingAddressCityTxZip),
    propertyAddress: getMapped(r, PROPERTY_COLUMNS.propertyAddress),
    cadMailingAddress: getMapped(r, PROPERTY_COLUMNS.cadMailingAddress),
    cadCity: getMapped(r, PROPERTY_COLUMNS.cadCity),
    cadZipCode: getMapped(r, PROPERTY_COLUMNS.cadZipCode),
    cadCounty: getMapped(r, PROPERTY_COLUMNS.cadCounty),
    accountNumber: accountNumber || undefined,
    clientNumber,
    bppFee: getMapped(r, PROPERTY_COLUMNS.bppFee),
    flatFee: getMapped(r, PROPERTY_COLUMNS.flatFee),
  };
}

/**
 * Get client number from a normalized row (used to group rows and skip invalid).
 */
export function getClientNumberFromRow(normalizedRow) {
  return getMapped(normalizedRow, CLIENT_COLUMNS.clientNumber);
}
