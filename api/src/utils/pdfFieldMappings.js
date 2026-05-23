/**
 * PDF form field → DB/entity field mappings.
 * Central place to maintain PDF field names and their data source.
 * Update here when PDF templates or DB schema change.
 *
 * Conventions:
 * - "client" = Client/Prospect record fields
 * - "property" = Property record fields (indexed rows in PDF)
 * - Checkbox values: "✔" or true = checked, else = unchecked
 */

// ─── AOA Form (50-162.pdf) ───────────────────────────────────────────────────

/** Static values and checkboxes; key = PDF field name, value = string or "✔" for checked */
export const AOA_CONSTANTS = {
  "Date Agents Authority Ends": "",
  Title: "Property Owner",
  "the property(ies) listed below:": "✔",
  Name_2: "Lone Star Property Tax, LLC",
  "Telephone Number include area code_2": "832-847-3900",
  Address_2: "1327 Kyle Hill Lane ",
  "City State Zip Code_2": "Sugar Land, TX 77479",
  "all property tax matters concerning the property identified": "✔",
  "all communications from the chief appraiser": "✔",
  "all communications from the appraisal review board": "✔",
  "all communications from all taxing units participating in the appraisal district":
    "",
  "the property owner": "✔",
  "a property manager authorized to designate agents for the owner": "",
  "other person authorized to act on behalf of the owner other than the person being designated as agent":
    "",
};

/** PDF field name → Property DB field name; value taken from first property. */
export const AOA_FIRST_PROPERTY_FIELDS = {
  "Appraisal District Name": "cadCounty",
  Name: "nameOnCad",
};

/** PDF field name → Client/Prospect DB field name */
export const AOA_CLIENT_FIELDS = {
  Address: "mailingAddress",
  "City State Zip Code": "mailingAddressCityTxZip",
  "Name of Property Owner": "clientName",
};

/**
 * Property row: PDF base name (suffix _2, _3, _4, _5 added in code) → Property DB field name.
 * Max 4 property rows in form; index 2–5.
 */
export const AOA_PROPERTY_FIELDS = {
  "Appraisal District Account Number": "accountNumber",
  // Must be full site/situs address (line + city/state/zip). Computed in pdfFill.js.
  "Physical or Situs Address of Property": "__FULL_PROPERTY_ADDRESS__",
};

/** PDF field for "number of additional sheets" when properties > 4 */
export const AOA_ADDITIONAL_SHEETS_FIELD = "Number of additional sheets attatched";

export const AOA_PROPERTY_INDEX_START = 2;
export const AOA_PROPERTY_MAX_ROWS = 4;

/** Radio group field that must always be set to "Yes". */
export const AOA_CONFIDENTIAL_RADIO_FIELD =
  "The agent identified above is authorized to receive confidential information pursuant to Tax Code §§11.48(b)(2), 22.27(b)(2), 23.123(c)(2), 23.126(c)(2), and 23.45(b)(2):";
export const AOA_CONFIDENTIAL_RADIO_VALUE = "Yes";

// ─── Contract Form (contract.pdf) ────────────────────────────────────────────

/** PDF field name → Client DB field name (value read from client) */
export const CONTRACT_CLIENT_FIELDS = {
  phone_number_1: "phoneNumber",
  email_add_1: "email",
  owner_name: "clientName",
  mailing_address_1: "mailingAddress",
};

/**
 * PDF fields that are computed (not taken directly from client/property).
 * Keys are PDF field names; value describes how to compute (used in pdfFill.js).
 */
export const CONTRACT_COMPUTED_FIELDS = ["date_1", "date_2", "contingency_fee_1", "contingency_fee_2"];

/**
 * Property row: PDF base name (suffix _1, _2, … added in code) → Property DB field name.
 */
export const CONTRACT_PROPERTY_FIELDS = {
  // Filled via formatPropertySitusAddress in pdfFill.js (CAD/situs, not mailing).
  property_address: "__PROPERTY_SITUS_FULL__",
  county: "cadCounty",
  account_number: "accountNumber",
  // Same client-level fee on each row (contingency % or flat $); computed in pdfFill.js.
  fee: "__CONTRACT_FEE_DISPLAY__",
};

export const CONTRACT_PROPERTY_INDEX_START = 1;
/** Default contingency percent (number; DB + PDF formatting use numeric values). */
export const CONTRACT_DEFAULT_FEE = 25;
