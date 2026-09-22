import { formatInvoiceClientName } from "./invoiceEmailTemplate.js";
import {
  PAYMENT_ACKNOWLEDGEMENT_TEMPLATE_KEY,
  renderEmailTemplate,
} from "./emailTemplateCatalog.js";

function uniquePropertyAddresses(propertyAddresses = []) {
  return [
    ...new Set(propertyAddresses.map((address) => String(address).trim()).filter(Boolean)),
  ];
}

export function formatPaymentAmount(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(amount) || 0);
}

export function formatPaymentPropertyAddress(propertyAddresses = []) {
  const unique = uniquePropertyAddresses(propertyAddresses);
  if (unique.length === 0) return "your property";
  if (unique.length === 1) return unique[0];
  return unique.join("; ");
}

export function renderPaymentAcknowledgementSubject(subjectTemplate) {
  return renderEmailTemplate(subjectTemplate, {}, { escape: false });
}

/**
 * HTML body for payment acknowledgement emails (Brevo transactional).
 */
export function renderPaymentAcknowledgementHtml(
  bodyTemplate,
  { clientName, paymentAmount, propertyAddresses = [] } = {}
) {
  return renderEmailTemplate(bodyTemplate, {
    clientName: formatInvoiceClientName(clientName),
    paymentAmount: formatPaymentAmount(paymentAmount),
    propertyAddress: formatPaymentPropertyAddress(propertyAddresses),
  });
}

export async function getPaymentAcknowledgementSubject(templateKey) {
  const { getStoredEmailTemplate } = await import("../services/emailTemplateService.js");
  const template = await getStoredEmailTemplate(
    templateKey || PAYMENT_ACKNOWLEDGEMENT_TEMPLATE_KEY,
    { purpose: "payment_acknowledgement" }
  );
  return renderPaymentAcknowledgementSubject(template.subject);
}

export async function getPaymentAcknowledgementHtml(args = {}) {
  const { getStoredEmailTemplate } = await import("../services/emailTemplateService.js");
  const template = await getStoredEmailTemplate(
    args.templateKey || PAYMENT_ACKNOWLEDGEMENT_TEMPLATE_KEY,
    { purpose: "payment_acknowledgement" }
  );
  return renderPaymentAcknowledgementHtml(template.bodyHtml, args);
}
