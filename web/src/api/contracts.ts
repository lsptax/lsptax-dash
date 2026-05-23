import { getAuthHeaders, getApiBaseUrl } from "./client";

const baseUrl = getApiBaseUrl;

export interface ContractListItem {
  id: number;
  type: string;
  status: string;
  clientId: number;
  propertyId?: number;
  envelopeId?: string;
  signedAt?: string | null;
  signedFileUrl?: string | null;
  createdAt: string;
  property?: { id: number; accountNumber?: string };
}

export const previewContract = async (clientId: number): Promise<{ contractPdf: string }> => {
  const response = await fetch(`${baseUrl()}/api/contracts/preview-contract`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ clientId }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || "Failed to preview contract");
  }
  return response.json();
};

export const previewAoa = async (
  clientId: number,
  propertyId: number
): Promise<{ aoaPdf: string }> => {
  const response = await fetch(`${baseUrl()}/api/contracts/preview-aoa`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ clientId, propertyId }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || "Failed to preview AOA");
  }
  return response.json();
};

export type SendDocsType = "contract" | "aoa" | "aoa_all" | "all_docs";

export type SendDocsRequest =
  | { clientId: number; type: "contract" }
  | { clientId: number; type: "aoa"; propertyId: number }
  | { clientId: number; type: "aoa_all" }
  | { clientId: number; type: "all_docs" };

export type SendDocsSingleResponse = {
  success: true;
  contract: { id: number; envelopeId: string; status: string };
  envelopeId: string;
};

export interface SendAoaAllResultItem {
  success: boolean;
  propertyId: number;
  envelopeId?: string;
  contract?: { id: number; envelopeId: string; status: string };
  message?: string;
}

export interface SendDocsAoaAllResponse {
  success: true;
  total: number;
  sent: number;
  failed: number;
  envelopeId?: string;
  results: SendAoaAllResultItem[];
}

export type SendDocsAllDocsResponse = {
  success: true;
  envelopeId: string;
  clientContract?: { id: number; envelopeId: string; status: string };
  aoa?: {
    total?: number;
    sent?: number;
    failed?: number;
    results?: SendAoaAllResultItem[];
  };
};

export type SendDocsResponse =
  | SendDocsSingleResponse
  | SendDocsAoaAllResponse
  | SendDocsAllDocsResponse;

export const sendDocs = async (
  clientId: number,
  type: SendDocsType,
  propertyId?: number
): Promise<SendDocsResponse> => {
  const body: Record<string, unknown> = { clientId, type };
  if (type === "aoa") body.propertyId = propertyId;

  const response = await fetch(`${baseUrl()}/api/contracts/send-docs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((data as { message?: string }).message || "Failed to send documents");
  }
  return data as SendDocsResponse;
};

export const sendAoaForAllProperties = async (clientId: number): Promise<SendDocsAoaAllResponse> => {
  return sendDocs(clientId, "aoa_all") as Promise<SendDocsAoaAllResponse>;
};

export const sendContractForClient = async (clientId: number): Promise<SendDocsSingleResponse> => {
  return sendDocs(clientId, "contract") as Promise<SendDocsSingleResponse>;
};

export const sendAoaForClient = async (clientId: number, propertyId: number): Promise<SendDocsSingleResponse> => {
  return sendDocs(clientId, "aoa", propertyId) as Promise<SendDocsSingleResponse>;
};

export const getContractsByClient = async (
  clientId: string | number
): Promise<ContractListItem[]> => {
  const id = typeof clientId === "string" ? clientId : String(clientId);
  const response = await fetch(`${baseUrl()}/api/contracts/client/${id}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error("Failed to fetch contracts");
  }
  const data = await response.json();
  return Array.isArray(data) ? data : data.contracts ?? [];
};

export const syncClientContractStatus = async (
  clientId: number
): Promise<{ success: boolean; updated?: number }> => {
  const response = await fetch(`${baseUrl()}/api/contracts/sync-client-status`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ clientId }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((data as { message?: string }).message || "Failed to sync contract status");
  }
  return data as { success: boolean; updated?: number };
};

const CONTRACT_DOWNLOAD_URL_EXPIRY_SECONDS = 3600;

export const getContractDownloadUrl = async (
  contractId: number,
  expiresIn = CONTRACT_DOWNLOAD_URL_EXPIRY_SECONDS
): Promise<{ url: string }> => {
  const response = await fetch(
    `${baseUrl()}/api/contracts/${contractId}/download-url?expiresIn=${expiresIn}`,
    { headers: getAuthHeaders() }
  );
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || "Signed document not yet available");
  }
  return response.json();
};

export const pollContractStatus = async (
  envelopeId: string
): Promise<{ success: boolean; status: string }> => {
  const response = await fetch(`${baseUrl()}/api/contracts/poll-status`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ envelopeId }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error((data as { message?: string }).message || "Failed to poll status");
  }
  return data as { success: boolean; status: string };
};
