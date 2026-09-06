const TITLE_PREFIX = /^(?:Mr\.?|Mrs\.?|Ms\.?|Miss|Dr\.?|Prof\.?)\s+/i;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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

export function getInvoiceEmailSubject({ year, propertyAddresses = [] }) {
  const yearLabel = year || new Date().getFullYear();
  return `${yearLabel} Protest Completed- Invoice and Results Attached${formatPropertyHeadlineSuffix(propertyAddresses)}`;
}

/**
 * HTML body for invoice delivery emails (Brevo transactional).
 */
export function getInvoiceEmailHtml({ clientName, year, propertyAddresses = [] }) {
  const displayName = escapeHtml(formatInvoiceClientName(clientName));
  const yearLabel = year || new Date().getFullYear();
  const propertySuffix = escapeHtml(formatPropertyHeadlineSuffix(propertyAddresses));
  const logoUrl = escapeHtml(getInvoiceEmailLogoUrl());
  const logoBlock = logoUrl
    ? `<p style="margin:8px 0 12px;"><img src="${logoUrl}" alt="Lone Star Property Tax" style="display:block;max-width:220px;width:100%;height:auto;" /></p>`
    : "";

  return `
<p>Dear ${displayName},</p>
<p><strong>${yearLabel} Protest Completed- Invoice and Results Attached${propertySuffix}</strong></p>
<p><strong>Payment Options:</strong><br/>
<strong>Zelle:</strong> 713-505-6806 (Lone Star Property Tax)<br/>
Kindly include the invoice number for reference.</p>
<p><strong>Mail Check:</strong><br/>
Lone Star Property Tax<br/>
16107 Kensington Drive, Ste #194<br/>
Sugar Land, TX 77479</p>
<p>Thank you for choosing Lone Star Property Tax. If you have any questions, please do not hesitate to contact us. We appreciate your business and look forward to serving you again next year.</p>
<p>Best regards,<br/>
Lavanya Sharma<br/>
Administrative Assistant<br/>
832-847-3911<br/>
info@lsptax.com<br/>
results@lsptax.com</p>
<p style="margin:8px 0 4px;">Thank you,</p>
${logoBlock}
<p style="margin:8px 0 0;font-size:10px;line-height:1.35;color:#555;">CONFIDENTIALITY NOTICE: The information contained in this e-mail message, including any attachments, is for the sole use of the intended recipient(s) and may contain confidential and privileged information. Any unauthorized review, use, disclosure or distribution is prohibited. If you are not the intended recipient, and have received this communication in error, please contact the sender by reply e-mail and destroy all copies of the original message.<br/>
Thank you.</p>
`.trim();
}

/**
 * Short SMS after invoice email is sent.
 */
export function getInvoiceSmsText({ clientName, year, recipientEmail }) {
  const yearPart = year ? ` ${year}` : "";
  const name = formatInvoiceClientName(clientName);
  return `Hi ${name}, your Lone Star Property Tax${yearPart} invoice has been emailed to ${recipientEmail}. Please check your inbox.`;
}
