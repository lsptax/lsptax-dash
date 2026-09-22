import {
  INVOICE_EMAIL_TEMPLATE_KEY,
  escapeHtml,
  renderEmailTemplate,
} from "./emailTemplateCatalog.js";

const TITLE_PREFIX = /^(?:Mr\.?|Mrs\.?|Ms\.?|Miss|Dr\.?|Prof\.?)\s+/i;

/** Strip honorifics (Mr./Mrs./etc.) for invoice salutations. */
export function formatInvoiceClientName(clientName) {
  const trimmed = String(clientName || "").trim();
  if (!trimmed) return "Client";
  return trimmed.replace(TITLE_PREFIX, "").trim() || "Client";
}

function uniquePropertyAddresses(propertyAddresses = []) {
  return [
    ...new Set(propertyAddresses.map((address) => String(address).trim()).filter(Boolean)),
  ];
}

function formatPropertyHeadlineSuffix(propertyAddresses = []) {
  const unique = uniquePropertyAddresses(propertyAddresses);
  if (unique.length === 0) return "";
  if (unique.length === 1) return ` (${unique[0]} property)`;
  return ` (${unique.map((address) => `${address} property`).join("; ")})`;
}

export function getInvoiceEmailLogoUrl() {
  return (process.env.INVOICE_EMAIL_LOGO_URL || "").trim();
}

export function buildInvoiceEmailLogoHtml(logoUrl = getInvoiceEmailLogoUrl()) {
  const url = String(logoUrl || "").trim();
  if (!url) return "";
  return `<p style="margin:8px 0 12px;"><img src="${escapeHtml(url)}" alt="Lone Star Property Tax" style="display:block;max-width:220px;width:100%;height:auto;" /></p>`;
}

export function renderInvoiceEmailSubject(subjectTemplate, { year, propertyAddresses = [] } = {}) {
  const yearLabel = year || new Date().getFullYear();
  return renderEmailTemplate(
    subjectTemplate,
    {
      year: String(yearLabel),
      propertySuffix: formatPropertyHeadlineSuffix(propertyAddresses),
    },
    { escape: false }
  );
}

export function renderInvoiceEmailHtml(
  bodyTemplate,
  { clientName, year, propertyAddresses = [], logoUrl } = {}
) {
  const yearLabel = year || new Date().getFullYear();
  return renderEmailTemplate(bodyTemplate, {
    clientName: formatInvoiceClientName(clientName),
    year: String(yearLabel),
    propertySuffix: formatPropertyHeadlineSuffix(propertyAddresses),
    logo: buildInvoiceEmailLogoHtml(logoUrl),
  }, { rawKeys: ["logo"] });
}

export async function getInvoiceEmailSubject({ year, propertyAddresses = [], templateKey } = {}) {
  const { getStoredEmailTemplate } = await import("../services/emailTemplateService.js");
  const template = await getStoredEmailTemplate(templateKey || INVOICE_EMAIL_TEMPLATE_KEY, {
    purpose: "invoice",
  });
  return renderInvoiceEmailSubject(template.subject, { year, propertyAddresses });
}

/**
 * HTML body for invoice delivery emails (Brevo transactional).
 */
export async function getInvoiceEmailHtml({
  clientName,
  year,
  propertyAddresses = [],
  logoUrl,
  templateKey,
} = {}) {
  const { getStoredEmailTemplate } = await import("../services/emailTemplateService.js");
  const template = await getStoredEmailTemplate(templateKey || INVOICE_EMAIL_TEMPLATE_KEY, {
    purpose: "invoice",
  });
  return renderInvoiceEmailHtml(template.bodyHtml, {
    clientName,
    year,
    propertyAddresses,
    logoUrl,
  });
}

/**
 * Short SMS after invoice email is sent.
 */
export function getInvoiceSmsText({ clientName, year, recipientEmail }) {
  const yearPart = year ? ` ${year}` : "";
  const name = formatInvoiceClientName(clientName);
  return `Hi ${name}, your Lone Star Property Tax${yearPart} invoice has been emailed to ${recipientEmail}. Please check your inbox.`;
}
