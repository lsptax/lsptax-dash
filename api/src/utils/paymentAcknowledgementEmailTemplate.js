import { formatInvoiceClientName } from "./invoiceEmailTemplate.js";

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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

export function getPaymentAcknowledgementSubject() {
  return "Payment Received -Thank You";
}

/**
 * HTML body for payment acknowledgement emails (Brevo transactional).
 */
export function getPaymentAcknowledgementHtml({
  clientName,
  paymentAmount,
  propertyAddresses = [],
}) {
  const displayName = escapeHtml(formatInvoiceClientName(clientName));
  const amountLabel = escapeHtml(formatPaymentAmount(paymentAmount));
  const propertyAddressLabel = escapeHtml(formatPaymentPropertyAddress(propertyAddresses));

  return `
<p>Dear ${displayName},</p>
<p>We have received your payment of ${amountLabel} for ${propertyAddressLabel}.</p>
<p>Thank you for your payment. We appreciate your business and the opportunity to assist you with your property tax needs. We look forward to working with you again next year.</p>
<p>Best regards,<br/>
Lone Star Property Tax<br/>
832-847-3911<br/>
Info@lsptax.com<br/>
Results@lsptax.com</p>
`.trim();
}
