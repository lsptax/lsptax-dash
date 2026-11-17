import prisma from "../../prisma/prismaClient.js";
import { sendTransactionalEmail } from "./brevoService.js";
import { getStoredEmailTemplate } from "./emailTemplateService.js";
import { PROSPECT_EMAIL_TEMPLATE_PURPOSE } from "../utils/emailTemplateCatalog.js";
import {
  renderProspectEmailHtml,
  renderProspectEmailSubject,
} from "../utils/prospectEmailTemplate.js";

function badRequest(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

/** @param {number} prospectId already parsed by the controller */
async function loadProspect(prospectId) {
  const prospect = await prisma.client.findFirst({
    where: { id: prospectId, type: "PROSPECT" },
    select: {
      id: true,
      clientName: true,
      email: true,
      billingEmail: true,
      isArchived: true,
      properties: {
        where: { isArchived: false },
        select: { propertyAddress: true },
      },
    },
  });
  if (!prospect) throw badRequest("Prospect not found", 404);
  return prospect;
}

/** The prospect's email and billing email, deduped. Only these addresses can be sent to. */
function prospectRecipients(prospect) {
  const recipients = [];
  const seen = new Set();
  for (const [field, label] of [
    ["email", "Email"],
    ["billingEmail", "Billing email"],
  ]) {
    const email = (prospect[field] || "").trim();
    if (!email || seen.has(email.toLowerCase())) continue;
    seen.add(email.toLowerCase());
    recipients.push({ email, label });
  }
  return recipients;
}

export async function getProspectEmailRecipients(prospectId) {
  const prospect = await loadProspect(prospectId);
  return {
    prospectId: prospect.id,
    clientName: prospect.clientName,
    isArchived: prospect.isArchived,
    recipients: prospectRecipients(prospect),
  };
}

export async function sendProspectEmail({ prospectId, templateKey, recipientEmails = [] }) {
  if (!templateKey) throw badRequest("templateKey is required");
  const prospect = await loadProspect(prospectId);
  if (prospect.isArchived) throw badRequest("Archived prospects cannot be emailed");

  const allowed = new Map(
    prospectRecipients(prospect).map((recipient) => [recipient.email.toLowerCase(), recipient.email])
  );
  const requested = (Array.isArray(recipientEmails) ? recipientEmails : [recipientEmails])
    .map((email) => String(email || "").trim().toLowerCase())
    .filter(Boolean);
  if (requested.length === 0) throw badRequest("Choose at least one recipient");
  const unknown = requested.filter((email) => !allowed.has(email));
  if (unknown.length) throw badRequest("Recipients must be this prospect's email addresses");
  const toEmails = [...new Set(requested)].map((email) => allowed.get(email));

  let template;
  try {
    template = await getStoredEmailTemplate(templateKey, {
      purpose: PROSPECT_EMAIL_TEMPLATE_PURPOSE,
    });
  } catch (error) {
    throw badRequest(error?.message || "Unknown email template");
  }

  const renderArgs = {
    clientName: prospect.clientName,
    propertyAddresses: prospect.properties.map((property) => property.propertyAddress),
  };
  const subject = renderProspectEmailSubject(template.subject, renderArgs);
  const htmlContent = renderProspectEmailHtml(template.bodyHtml, renderArgs);

  const sent = [];
  const failed = [];
  for (const toEmail of toEmails) {
    try {
      const { messageId } = await sendTransactionalEmail({
        toEmail,
        toName: prospect.clientName || toEmail,
        subject,
        htmlContent,
        tags: ["prospect"],
      });
      sent.push({ email: toEmail, messageId });
    } catch (error) {
      failed.push({ email: toEmail, error: error?.message || "Send failed" });
    }
  }

  return { sent, failed };
}
