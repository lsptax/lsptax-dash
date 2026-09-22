export const INVOICE_EMAIL_TEMPLATE_KEY = "invoice_delivery";
export const PAYMENT_ACKNOWLEDGEMENT_TEMPLATE_KEY = "payment_acknowledgement";

export const EMAIL_TEMPLATE_PURPOSES = ["invoice", "payment_acknowledgement"];
export const UNASSIGNED_EMAIL_TEMPLATE_PURPOSE = "unassigned";

const UNASSIGNED_STARTER = {
  subject: "New email",
  bodyHtml: "<p>Write your message here.</p>",
};

const SUBJECT_MAX = 300;
const BODY_MAX = 100_000;

const INVOICE_BODY_HTML = `<p>Dear {{clientName}},</p>
<p><strong>{{year}} Protest Completed- Invoice and Results Attached{{propertySuffix}}</strong></p>
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
{{logo}}
<p style="margin:8px 0 0;font-size:10px;line-height:1.35;color:#555;">CONFIDENTIALITY NOTICE: The information contained in this e-mail message, including any attachments, is for the sole use of the intended recipient(s) and may contain confidential and privileged information. Any unauthorized review, use, disclosure or distribution is prohibited. If you are not the intended recipient, and have received this communication in error, please contact the sender by reply e-mail and destroy all copies of the original message.<br/>
Thank you.</p>`;

const PAYMENT_BODY_HTML = `<p>Dear {{clientName}},</p>
<p>We have received your payment of {{paymentAmount}} for {{propertyAddress}}.</p>
<p>Thank you for your payment. We appreciate your business and the opportunity to assist you with your property tax needs. We look forward to working with you again next year.</p>
<p>Best regards,<br/>
Lone Star Property Tax<br/>
832-847-3911<br/>
Info@lsptax.com<br/>
Results@lsptax.com</p>`;

export const EMAIL_TEMPLATE_CATALOG = [
  {
    key: INVOICE_EMAIL_TEMPLATE_KEY,
    name: "Invoice email",
    purpose: "invoice",
    description: "Sent when invoice PDFs are emailed to a client.",
    subject: "{{year}} Protest Completed- Invoice and Results Attached{{propertySuffix}}",
    bodyHtml: INVOICE_BODY_HTML,
    placeholders: [
      {
        token: "clientName",
        label: "Client name, without a title such as Mr. or Mrs.",
        sample: "Jane Smith",
      },
      { token: "year", label: "Tax year", sample: "2026" },
      {
        token: "propertySuffix",
        label: "Property note added to the headline. Blank when there is no address.",
        sample: " (123 Main St property)",
      },
      {
        token: "logo",
        label: "Logo image. Uses the invoice logo URL from Brevo settings.",
        sample: "",
        raw: true,
      },
    ],
  },
  {
    key: PAYMENT_ACKNOWLEDGEMENT_TEMPLATE_KEY,
    name: "Payment acknowledgement",
    purpose: "payment_acknowledgement",
    description: "Sent after invoices are marked paid, when acknowledgement email is enabled.",
    subject: "Payment Received -Thank You",
    bodyHtml: PAYMENT_BODY_HTML,
    placeholders: [
      {
        token: "clientName",
        label: "Client name, without a title such as Mr. or Mrs.",
        sample: "Jane Smith",
      },
      { token: "paymentAmount", label: "Payment amount", sample: "$1,250.00" },
      {
        token: "propertyAddress",
        label: "Property address, or \"your property\" when none is available",
        sample: "123 Main St",
      },
    ],
  },
];

const CATALOG_BY_KEY = new Map(EMAIL_TEMPLATE_CATALOG.map((template) => [template.key, template]));

export function getEmailTemplateDefinition(key) {
  return CATALOG_BY_KEY.get(key) || null;
}

export function getBuiltinTemplateForPurpose(purpose) {
  return EMAIL_TEMPLATE_CATALOG.find((template) => template.purpose === purpose) || null;
}

export function isEmailTemplatePurpose(purpose) {
  return EMAIL_TEMPLATE_PURPOSES.includes(purpose);
}

export function resolveEmailTemplatePurpose(purpose, { allowMissing = false } = {}) {
  if (purpose == null || purpose === "") {
    return allowMissing ? UNASSIGNED_EMAIL_TEMPLATE_PURPOSE : null;
  }
  if (purpose === UNASSIGNED_EMAIL_TEMPLATE_PURPOSE || isEmailTemplatePurpose(purpose)) {
    return purpose;
  }
  return null;
}

export function placeholdersForEmailTemplatePurpose(purpose) {
  if (purpose === UNASSIGNED_EMAIL_TEMPLATE_PURPOSE) {
    const seen = new Set();
    const placeholders = [];
    for (const template of EMAIL_TEMPLATE_CATALOG) {
      for (const placeholder of template.placeholders) {
        if (seen.has(placeholder.token)) continue;
        seen.add(placeholder.token);
        placeholders.push(placeholder);
      }
    }
    return placeholders;
  }
  return getBuiltinTemplateForPurpose(purpose)?.placeholders ?? [];
}

export function starterForEmailTemplatePurpose(purpose) {
  if (purpose === UNASSIGNED_EMAIL_TEMPLATE_PURPOSE) return UNASSIGNED_STARTER;
  const builtin = getBuiltinTemplateForPurpose(purpose);
  if (!builtin) return null;
  return { subject: builtin.subject, bodyHtml: builtin.bodyHtml };
}

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const PLACEHOLDER_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

/**
 * Replace {{token}} placeholders.
 * Body values are HTML-escaped. Pass rawKeys for snippets that are already safe markup.
 */
export function renderEmailTemplate(template, values = {}, { escape = true, rawKeys = [] } = {}) {
  const raw = new Set(rawKeys);
  return String(template)
    .replace(PLACEHOLDER_PATTERN, (match, token) => {
      if (!Object.prototype.hasOwnProperty.call(values, token) || values[token] == null) {
        return "";
      }
      const text = String(values[token]);
      if (!escape || raw.has(token)) return text;
      return escapeHtml(text);
    })
    .trim();
}

export function validateEmailTemplateInput({ subject, bodyHtml } = {}) {
  const errors = [];
  const nextSubject = typeof subject === "string" ? subject.trim() : "";
  const nextBody = typeof bodyHtml === "string" ? bodyHtml.trim() : "";

  if (!nextSubject) errors.push("Subject is required");
  else if (nextSubject.length > SUBJECT_MAX) {
    errors.push(`Subject must be ${SUBJECT_MAX} characters or fewer`);
  } else if (/[\r\n]/.test(subject)) {
    errors.push("Subject must be a single line");
  }

  if (!nextBody) errors.push("Email body is required");
  else if (nextBody.length > BODY_MAX) errors.push("Email body is too long");

  return { subject: nextSubject, bodyHtml: nextBody, errors };
}
