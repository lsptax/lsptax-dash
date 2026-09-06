import axios from "axios";

const BREVO_BASE_URL = "https://api.brevo.com/v3";

function getApiKey() {
  const key = (process.env.BREVO_API_KEY || "").trim();
  if (!key) {
    throw new Error("BREVO_API_KEY is not configured");
  }
  return key;
}

function getHeaders() {
  return {
    "Content-Type": "application/json",
    "api-key": getApiKey(),
  };
}

function getInvoiceEmailSender() {
  const email = (
    process.env.BREVO_INVOICE_SENDER_EMAIL ||
    process.env.BREVO_SENDER_EMAIL ||
    ""
  ).trim();
  const name = (
    process.env.BREVO_INVOICE_SENDER_NAME ||
    process.env.BREVO_SENDER_NAME ||
    "LSPT Results"
  ).trim();
  if (!email) {
    throw new Error("BREVO_INVOICE_SENDER_EMAIL (or BREVO_SENDER_EMAIL) is not configured");
  }
  return { email, name };
}

function getSmsSender() {
  return (process.env.BREVO_SMS_SENDER || "LSP Tax").trim();
}

function formatBrevoError(err) {
  const data = err?.response?.data;
  if (typeof data === "string") return data;
  if (data?.message) return data.message;
  return err?.message || "Brevo request failed";
}

/**
 * @param {object} params
 * @param {string} params.toEmail
 * @param {string} [params.toName]
 * @param {string} params.subject
 * @param {string} params.htmlContent
 * @param {{ filename: string, contentBase64: string, contentId?: string }[]} [params.attachments]
 * @param {string[]} [params.tags]
 */
export async function sendTransactionalEmail({
  toEmail,
  toName,
  subject,
  htmlContent,
  attachments = [],
  tags = [],
}) {
  const sender = getInvoiceEmailSender();
  const body = {
    sender,
    replyTo: { email: sender.email, name: sender.name },
    to: [{ email: toEmail, name: toName || toEmail }],
    subject,
    htmlContent,
  };

  if (tags.length > 0) {
    body.tags = tags;
  }

  if (attachments.length > 0) {
    body.attachment = attachments.map((file) => {
      const item = {
        name: file.filename,
        content: file.contentBase64,
      };
      if (file.contentId) item.contentId = file.contentId;
      return item;
    });
  }

  try {
    const res = await axios.post(`${BREVO_BASE_URL}/smtp/email`, body, {
      headers: getHeaders(),
    });
    return { messageId: res.data?.messageId ? String(res.data.messageId) : null };
  } catch (err) {
    throw new Error(`Brevo email failed: ${formatBrevoError(err)}`);
  }
}

/**
 * @param {object} params
 * @param {string} params.recipient E.164 phone number
 * @param {string} params.content
 */
export async function sendTransactionalSms({ recipient, content }) {
  const body = {
    sender: getSmsSender(),
    recipient,
    content,
    type: "transactional",
  };

  try {
    const res = await axios.post(`${BREVO_BASE_URL}/transactionalSMS/send`, body, {
      headers: getHeaders(),
    });
    return { messageId: res.data?.messageId ? String(res.data.messageId) : null };
  } catch (err) {
    throw new Error(`Brevo SMS failed: ${formatBrevoError(err)}`);
  }
}

/**
 * Fetch transactional email event history from Brevo by messageId.
 * @param {string} messageId
 * @returns {Promise<{ name: string, time: string }[]>}
 */
export async function getTransactionalEmailEvents(messageId) {
  const normalizedMessageId = String(messageId || "").trim();
  if (!normalizedMessageId) return [];

  try {
    const listRes = await axios.get(`${BREVO_BASE_URL}/smtp/emails`, {
      headers: getHeaders(),
      params: {
        messageId: normalizedMessageId,
        sort: "desc",
        limit: 1,
      },
    });

    const uuid = listRes.data?.transactionalEmails?.[0]?.uuid;
    if (!uuid) return [];

    const detailRes = await axios.get(`${BREVO_BASE_URL}/smtp/emails/${uuid}`, {
      headers: getHeaders(),
    });

    return Array.isArray(detailRes.data?.events) ? detailRes.data.events : [];
  } catch (err) {
    throw new Error(`Brevo email events failed: ${formatBrevoError(err)}`);
  }
}
