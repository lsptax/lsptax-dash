import { authFetch, getApiBaseUrl } from "@/api/client";

export type ProspectEmailRecipient = {
  email: string;
  label: string;
};

export type ProspectEmailRecipients = {
  prospectId: number;
  clientName: string | null;
  isArchived: boolean;
  recipients: ProspectEmailRecipient[];
};

export type ProspectEmailSendResult = {
  sent: { email: string; messageId: string | null }[];
  failed: { email: string; error: string }[];
};

async function readJson<T>(res: Response, fallback: string): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof body?.message === "string" ? body.message : fallback);
  }
  return body as T;
}

export async function getProspectEmailRecipients(prospectId: number): Promise<ProspectEmailRecipients> {
  const res = await authFetch(`${getApiBaseUrl()}/action/prospect-email/recipients`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prospectId }),
  });
  return readJson<ProspectEmailRecipients>(res, "Failed to load recipients");
}

export async function sendProspectEmail(input: {
  prospectId: number;
  templateKey: string;
  recipientEmails: string[];
}): Promise<{ message: string; data: ProspectEmailSendResult }> {
  const res = await authFetch(`${getApiBaseUrl()}/action/prospect-email/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readJson<{ message: string; data: ProspectEmailSendResult }>(res, "Failed to send email");
}
