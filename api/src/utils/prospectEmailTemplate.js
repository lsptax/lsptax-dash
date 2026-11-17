import { buildInvoiceEmailLogoHtml, formatInvoiceClientName } from "./invoiceEmailTemplate.js";
import { formatPaymentPropertyAddress } from "./paymentAcknowledgementEmailTemplate.js";
import { renderEmailTemplate } from "./emailTemplateCatalog.js";

export function renderProspectEmailSubject(subjectTemplate, { clientName, propertyAddresses = [] } = {}) {
  return renderEmailTemplate(
    subjectTemplate,
    {
      clientName: formatInvoiceClientName(clientName),
      propertyAddress: formatPaymentPropertyAddress(propertyAddresses),
    },
    { escape: false }
  );
}

/**
 * HTML body for emails sent from a prospect's page (Brevo transactional).
 */
export function renderProspectEmailHtml(
  bodyTemplate,
  { clientName, propertyAddresses = [], logoUrl } = {}
) {
  return renderEmailTemplate(
    bodyTemplate,
    {
      clientName: formatInvoiceClientName(clientName),
      propertyAddress: formatPaymentPropertyAddress(propertyAddresses),
      logo: buildInvoiceEmailLogoHtml(logoUrl),
    },
    { rawKeys: ["logo"] }
  );
}
