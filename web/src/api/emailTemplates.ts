import { authFetch, getApiBaseUrl } from "@/api/client";

export type EmailTemplatePlaceholder = {
  token: string;
  label: string;
  sample: string;
  raw?: boolean;
};

export type EmailTemplatePurpose = "unassigned" | "invoice" | "payment_acknowledgement";

export const EMAIL_TEMPLATE_PURPOSE_OPTIONS: EmailTemplatePurpose[] = [
  "unassigned",
  "invoice",
  "payment_acknowledgement",
];

export const EMAIL_TEMPLATE_PURPOSE_LABELS: Record<EmailTemplatePurpose, string> = {
  unassigned: "Unassigned",
  invoice: "Invoice sending",
  payment_acknowledgement: "Payment acknowledgement",
};

export function placeholdersForPurpose(
  purpose: EmailTemplatePurpose,
  templates: EmailTemplate[] | undefined
): EmailTemplatePlaceholder[] {
  if (!templates?.length) return [];
  if (purpose === "unassigned") {
    const seen = new Set<string>();
    const placeholders: EmailTemplatePlaceholder[] = [];
    for (const template of templates) {
      if (!template.isBuiltin) continue;
      for (const placeholder of template.placeholders) {
        if (seen.has(placeholder.token)) continue;
        seen.add(placeholder.token);
        placeholders.push(placeholder);
      }
    }
    return placeholders;
  }
  return templates.find((template) => template.isBuiltin && template.purpose === purpose)?.placeholders ?? [];
}

export type EmailTemplate = {
  key: string;
  name: string;
  purpose: EmailTemplatePurpose;
  isBuiltin: boolean;
  description: string | null;
  subject: string;
  bodyHtml: string;
  placeholders: EmailTemplatePlaceholder[];
  updatedAt: string | null;
};

async function readJson<T>(res: Response, fallback: string): Promise<T> {
  if (res.status === 403) {
    throw new Error("Email templates are limited to management users.");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof body?.message === "string" ? body.message : fallback);
  }
  return body as T;
}

export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  const res = await authFetch(`${getApiBaseUrl()}/api/email-templates`);
  return readJson<EmailTemplate[]>(res, "Failed to load email templates");
}

export async function updateEmailTemplate(
  key: string,
  input: { name?: string; purpose?: EmailTemplatePurpose; subject: string; bodyHtml: string }
): Promise<EmailTemplate> {
  const res = await authFetch(`${getApiBaseUrl()}/api/email-templates/${encodeURIComponent(key)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readJson<EmailTemplate>(res, "Failed to save email template");
}

export async function createEmailTemplate(input: {
  name: string;
  purpose: EmailTemplatePurpose;
}): Promise<EmailTemplate> {
  const res = await authFetch(`${getApiBaseUrl()}/api/email-templates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readJson<EmailTemplate>(res, "Failed to create email template");
}

export async function deleteEmailTemplate(key: string): Promise<void> {
  const res = await authFetch(`${getApiBaseUrl()}/api/email-templates/${encodeURIComponent(key)}`, {
    method: "DELETE",
  });
  await readJson(res, "Failed to delete email template");
}

export async function resetEmailTemplate(key: string): Promise<EmailTemplate> {
  const res = await authFetch(
    `${getApiBaseUrl()}/api/email-templates/${encodeURIComponent(key)}/reset`,
    { method: "POST" }
  );
  return readJson<EmailTemplate>(res, "Failed to reset email template");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const PLACEHOLDER_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

export function previewEmailTemplate(
  template: string,
  values: Record<string, string>,
  { escape = true, rawTokens = [] }: { escape?: boolean; rawTokens?: string[] } = {}
): string {
  const raw = new Set(rawTokens);
  return template
    .replace(PLACEHOLDER_PATTERN, (_match, token: string) => {
      if (!Object.prototype.hasOwnProperty.call(values, token) || values[token] == null) {
        return "";
      }
      const text = String(values[token]);
      if (!escape || raw.has(token)) return text;
      return escapeHtml(text);
    })
    .trim();
}

export function invoiceLogoPreviewHtml(logoUrl: string): string {
  const url = logoUrl.trim();
  if (!url) return "";
  return `<p style="margin:8px 0 12px;"><img src="${escapeHtml(url)}" alt="Lone Star Property Tax" style="display:block;max-width:220px;width:100%;height:auto;" /></p>`;
}
