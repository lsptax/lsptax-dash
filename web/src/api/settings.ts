import { authFetch, getApiBaseUrl } from "@/api/client";

export type InfraSettings = {
  brevo: {
    senderEmail: string;
    senderName: string;
    smsSender: string;
    invoiceLogoUrl: string;
  };
  supabase: {
    url: string;
  };
  docusign: {
    authServer: string;
    restBaseUrl: string;
    allowDemoInProduction: boolean;
    allowMultipleClientContractSends: boolean;
    allowMultipleAoaSends: boolean;
  };
};

async function readJson<T>(res: Response, fallback: string): Promise<T> {
  if (res.status === 403) {
    throw new Error("Infrastructure settings are limited to management users.");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof body?.message === "string" ? body.message : fallback);
  }
  return body as T;
}

export async function getInfraSettings(): Promise<InfraSettings> {
  const res = await authFetch(`${getApiBaseUrl()}/api/settings`);
  return readJson<InfraSettings>(res, "Failed to load settings");
}

export async function updateInfraSettings(
  patch: Partial<InfraSettings>
): Promise<InfraSettings> {
  const res = await authFetch(`${getApiBaseUrl()}/api/settings`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  return readJson<InfraSettings>(res, "Failed to save settings");
}
