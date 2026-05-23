import fs from "fs";
import { PDFDocument, StandardFonts, PDFName } from "pdf-lib";
import {
  AOA_CONSTANTS,
  AOA_FIRST_PROPERTY_FIELDS,
  AOA_CLIENT_FIELDS,
  AOA_PROPERTY_FIELDS,
  AOA_ADDITIONAL_SHEETS_FIELD,
  AOA_PROPERTY_INDEX_START,
  AOA_PROPERTY_MAX_ROWS,
  AOA_CONFIDENTIAL_RADIO_FIELD,
  AOA_CONFIDENTIAL_RADIO_VALUE,
  CONTRACT_CLIENT_FIELDS,
  CONTRACT_COMPUTED_FIELDS,
  CONTRACT_PROPERTY_FIELDS,
  CONTRACT_PROPERTY_INDEX_START,
  CONTRACT_DEFAULT_FEE,
} from "./pdfFieldMappings.js";

/** Font size (pt) used for filled form field text. Reduce this if text is too large. */
const FORM_FIELD_FONT_SIZE = 10;

/**
 * Format a phone string as US XXX-XXX-XXXX (e.g. 832-847-3900).
 * Strips non-digits; if 10+ digits, uses last 10 (area + number); otherwise returns as-is with dashes where possible.
 * @param {string} value - Raw phone (e.g. "8328473900", "(832) 847-3900")
 * @returns {string} Formatted like 832-847-3900
 */
function formatUsPhone(value) {
  if (value == null || value === "") return "";
  const digits = String(value).replace(/\D/g, "");
  if (digits.length >= 10) {
    const ten = digits.slice(-10);
    return `${ten.slice(0, 3)}-${ten.slice(3, 6)}-${ten.slice(6)}`;
  }
  if (digits.length >= 6) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length >= 3) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return digits;
}

/**
 * Join address line + city/state/zip into one clean string.
 * (Used for "Physical or Situs Address" where the form expects full address.)
 */
function formatFullAddress(line1, cityStateZip) {
  return [line1, cityStateZip].map((v) => String(v || "").trim()).filter(Boolean).join(", ");
}

/**
 * City + ZIP line from Property CAD fields (Texas situs).
 */
function formatTexasCadCityZip(property) {
  const city = String(property?.cadCity ?? "").trim();
  const zip = String(property?.cadZipCode ?? "").trim();
  if (!city && !zip) return "";
  if (city && zip) {
    if (/\bTX\b/i.test(city)) return `${city} ${zip}`.trim();
    return `${city}, TX ${zip}`;
  }
  return city || zip;
}

/**
 * Full situs / CAD property address for contract + AOA property rows (not client mailing).
 * Prefers the explicit propertyAddress (CSV "Physical or Situs Address of Property"),
 * then falls back to existing mailing/CAD fields.
 * @param {object} property - Property record
 */
function formatPropertySitusAddress(property) {
  const explicit = String(property?.propertyAddress ?? "").trim();
  const mailingLine = String(property?.mailingAddress ?? "").trim();
  const mailingCityZip = String(property?.mailingAddressCityTxZip ?? "").trim();
  const siteLine = String(property?.cadMailingAddress ?? "").trim();
  const cityZip = formatTexasCadCityZip(property);

  // Primary source: dedicated situs/physical address field.
  if (explicit) return explicit;

  // Fallback: property table mailing fields (often used as a property address in legacy data).
  const mailingFull = formatFullAddress(mailingLine, mailingCityZip);
  if (mailingFull) return mailingFull;

  // Fallback to CAD situs fields.
  if (siteLine) return formatFullAddress(siteLine, cityZip);

  // Last resort.
  return cityZip;
}

/**
 * AOA form requirement: the "Physical or Situs Address of Property" field must
 * ONLY come from the Property table's `propertyAddress`.
 * @param {object} property - Property record
 */
function formatAoAPropertySitusAddress(property) {
  return String(property?.propertyAddress ?? "").trim();
}

/**
 * Contract PDF fee display: always contingency as percentage (%), never $.
 * Accepts numbers or strings like "25" / "25%"; falls back to default when invalid.
 * @param {object | null | undefined} client
 * @param {number} defaultContingencyPct - e.g. 25
 */
function formatContractFeeDisplay(client, defaultContingencyPct) {
  const raw = client?.contingencyFee;
  const parsed =
    typeof raw === "string" ? Number(raw.replace(/[^\d.-]/g, "")) : Number(raw);
  const fallback = Number(defaultContingencyPct);
  const pctNum = Number.isFinite(parsed) ? parsed : fallback;
  if (!Number.isFinite(pctNum)) return "";
  return `${pctNum}%`;
}

/**
 * Grab the checkmark ("On") appearance ref from a checked checkbox so we can
 * reuse it for radio-button widgets that should show ✔ instead of ●.
 * Also grabs the "Off" appearance so unchecked widgets render as an empty
 * checkbox-square rather than an empty radio-circle.
 * Returns null if no suitable appearance is found.
 */
function getCheckboxAppearanceRefs(form, checkboxFieldName) {
  try {
    const cb = form.getCheckBox(checkboxFieldName);
    const widget = cb.acroField.getWidgets()[0];
    const apDict = widget.dict.get(PDFName.of("AP"));
    const normalDict = apDict?.get(PDFName.of("N"));
    if (!normalDict || typeof normalDict.get !== "function") return null;
    const onRef = normalDict.get(PDFName.of("On")) ?? null;
    const offRef = normalDict.get(PDFName.of("Off")) ?? null;
    if (!onRef && !offRef) return null;
    return { onRef, offRef };
  } catch {
    return null;
  }
}

/**
 * Replace a radio-button widget's "on" appearance with a checkbox-style
 * checkmark appearance so it renders ✔ instead of ●, and its "Off" appearance
 * so it renders as an empty checkbox-square rather than an empty circle.
 */
function setRadioWidgetCheckboxAppearances(widget, { onRef, offRef }) {
  const onValue = widget.getOnValue();
  if (!onValue) return;
  const apDict = widget.dict.get(PDFName.of("AP"));
  if (!apDict) return;
  const normalDict = apDict.get(PDFName.of("N"));
  if (!normalDict || typeof normalDict.set !== "function") return;
  if (onRef) normalDict.set(onValue, onRef);
  if (offRef) normalDict.set(PDFName.of("Off"), offRef);
}

/** PDF default appearance: black text + font size (so filled fields match the rest of the document). */
const getDefaultAppearance = () => `0 0 0 rg /Helv ${FORM_FIELD_FONT_SIZE} Tf`;

/**
 * Set black default appearance on all text fields and update their appearances with Helvetica.
 * Call before save(); then use save({ updateFieldAppearances: false }) so filled text is black.
 * @param {import("pdf-lib").PDFForm} form
 * @param {import("pdf-lib").PDFDocument} pdfDoc
 */
async function setBlackTextAppearances(form, pdfDoc) {
  const font = await pdfDoc.embedStandardFont(StandardFonts.Helvetica);
  const fields = form.getFields();
  const da = getDefaultAppearance();
  for (const field of fields) {
    if (field.constructor.name === "PDFTextField") {
      try {
        if (typeof field.acroField.setDefaultAppearance === "function") {
          field.acroField.setDefaultAppearance(da);
        }
        const widgets = typeof field.acroField.getWidgets === "function" ? field.acroField.getWidgets() : [];
        for (const widget of widgets) {
          if (typeof widget.setDefaultAppearance === "function") {
            widget.setDefaultAppearance(da);
          }
        }
      } catch (e) {
        // ignore if internal API differs
      }
    }
  }
  form.updateFieldAppearances(font);
}

/**
 * Fill AOA form PDF. Use one or more properties (for single-property AOA pass [property]).
 * @param {string} pdfPath - Path to 50-162.pdf
 * @param {object} client - Client/Prospect record (see AOA_CLIENT_FIELDS in pdfFieldMappings.js)
 * @param {object[]} properties - Array of property records (see AOA_PROPERTY_FIELDS)
 * @returns {Promise<string>} Base64 PDF
 */
export async function fillAOAForm(pdfPath, client, properties) {
  const pdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();

  // Fill dynamic date fields at send time (PDF generation time).
  const today = new Date().toLocaleDateString();
  const aoaConstants = {
    ...AOA_CONSTANTS,
    // "Date Agents Authority Ends": today,
    Date: today,
  };

  // Constants and checkboxes
  for (const [field, value] of Object.entries(aoaConstants)) {
    try {
      const formField = form.getField(field);
      if (formField.constructor.name === "PDFCheckBox") {
        if (value === "✔" || value === true) {
          form.getCheckBox(field).check();
        } else {
          form.getCheckBox(field).uncheck();
        }
      } else {
        form.getTextField(field).setText(String(value));
      }
    } catch (e) {
      // field not in PDF
    }
  }

  // Confidential-info radio group → always "Yes"
  try {
    form.getRadioGroup(AOA_CONFIDENTIAL_RADIO_FIELD).select(AOA_CONFIDENTIAL_RADIO_VALUE);
  } catch (e) {
    // field missing from template
  }

  // Appraisal District Name = county from first property
  const firstProperty = (properties || [])[0];
  for (const [pdfField, dbField] of Object.entries(AOA_FIRST_PROPERTY_FIELDS)) {
    try {
      const value = firstProperty?.[dbField] ?? "";
      form.getTextField(pdfField).setText(String(value));
    } catch (e) {}
  }

  // Client fields from mapping
  for (const [pdfField, dbField] of Object.entries(AOA_CLIENT_FIELDS)) {
    try {
      let value = client[dbField] ?? "";
      if (dbField === "phoneNumber") value = formatUsPhone(value);
      form.getTextField(pdfField).setText(String(value));
    } catch (e) {}
  }

  // Property rows (index 2..5, max 4 rows)
  (properties || []).forEach((property, index) => {
    if (index >= AOA_PROPERTY_MAX_ROWS) return;
    const i = AOA_PROPERTY_INDEX_START + index;
    for (const [pdfBase, dbField] of Object.entries(AOA_PROPERTY_FIELDS)) {
      try {
        const pdfField = `${pdfBase}_${i}`;
        const value =
          dbField === "__FULL_PROPERTY_ADDRESS__"
            ? formatAoAPropertySitusAddress(property)
            : (property?.[dbField] ?? "");
        form.getTextField(pdfField).setText(String(value));
      } catch (e) {}
    }
  });

  if (properties && properties.length > AOA_PROPERTY_MAX_ROWS) {
    try {
      form
        .getTextField(AOA_ADDITIONAL_SHEETS_FIELD)
        .setText(String(properties.length - AOA_PROPERTY_MAX_ROWS));
    } catch (e) {}
  }

  await setBlackTextAppearances(form, pdfDoc);

  // Override radio button appearance with a ✔ copied from a checked checkbox
  try {
    const appearanceRefs = getCheckboxAppearanceRefs(
      form,
      "all communications from the chief appraiser"
    );
    if (appearanceRefs) {
      const radioGroup = form.getRadioGroup(AOA_CONFIDENTIAL_RADIO_FIELD);
      for (const widget of radioGroup.acroField.getWidgets()) {
        setRadioWidgetCheckboxAppearances(widget, appearanceRefs);
      }
    }
  } catch (e) {
    // field missing from template
  }

  const modifiedPdfBytes = await pdfDoc.save({ updateFieldAppearances: false });
  return Buffer.from(modifiedPdfBytes).toString("base64");
}

/**
 * Fill client contract PDF with client and properties.
 * @param {string} pdfPath - Path to contract.pdf
 * @param {object} client - Client/Prospect record (see CONTRACT_CLIENT_FIELDS in pdfFieldMappings.js)
 * @param {object[]} properties - Property records (see CONTRACT_PROPERTY_FIELDS)
 * @returns {Promise<string>} Base64 PDF
 */
export async function fillContractForm(pdfPath, client, properties) {
  const pdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();

  const contractFeeDisplay = formatContractFeeDisplay(
    client,
    CONTRACT_DEFAULT_FEE
  );

  // Client fields from mapping
  for (const [pdfField, dbField] of Object.entries(CONTRACT_CLIENT_FIELDS)) {
    try {
      let value = client[dbField] ?? "";
      if (dbField === "phoneNumber") value = formatUsPhone(value);
      if (pdfField.startsWith("mailing_address")) {
        value = formatFullAddress(client?.mailingAddress, client?.mailingAddressCityTxZip);
      }
      form.getTextField(pdfField).setText(String(value));
    } catch (e) {}
  }

  // Computed fields (dates and client-level fee — % contingency or $ flat)
  const computedValues = {
    date_1: new Date().toLocaleDateString(),
    date_2: new Date().toLocaleDateString(),
    contingency_fee_1: contractFeeDisplay,
    contingency_fee_2: contractFeeDisplay,
  };
  for (const pdfField of CONTRACT_COMPUTED_FIELDS) {
    try {
      form.getTextField(pdfField).setText(String(computedValues[pdfField] ?? ""));
    } catch (e) {}
  }

  // Property rows (index 1, 2, …)
  (properties || []).forEach((property, index) => {
    const i = CONTRACT_PROPERTY_INDEX_START + index;
    for (const [pdfBase, dbField] of Object.entries(CONTRACT_PROPERTY_FIELDS)) {
      try {
        const pdfField = `${pdfBase}_${i}`;
        const value =
          pdfBase === "property_address"
            ? formatPropertySitusAddress(property)
            : dbField === "__CONTRACT_FEE_DISPLAY__"
              ? contractFeeDisplay
            : (property?.[dbField] ?? "");
        const textField = form.getTextField(pdfField);
        if (pdfBase === "property_address" && typeof textField.setFontSize === "function") {
          textField.setFontSize(8);
        }
        textField.setText(String(value));
      } catch (e) {}
    }
  });

  await setBlackTextAppearances(form, pdfDoc);
  const modifiedPdfBytes = await pdfDoc.save({ updateFieldAppearances: false });
  return Buffer.from(modifiedPdfBytes).toString("base64");
}
