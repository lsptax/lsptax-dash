import { getAuthHeaders, getApiBaseUrl } from "./client";

const baseUrl = getApiBaseUrl;

async function postCsv(endpoint: string, file: File) {
  const formData = new FormData();
  formData.append("csv", file);

  const response = await fetch(`${baseUrl()}${endpoint}`, {
    method: "POST",
    headers: {
      ...getAuthHeaders(),
    },
    body: formData,
  });

  const text = await response.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    // ignore
  }

  if (!response.ok) {
    const err = new Error(
      (data?.message as string) || (data?.error as string) || "CSV request failed"
    ) as Error & { details?: Record<string, unknown> };
    err.details = data;
    throw err;
  }

  return data;
}

export const previewClientsPropertiesCsv = async (file: File) =>
  postCsv("/csv/preview-clients-properties", file);

export const uploadClientsPropertiesCsv = async (file: File) =>
  postCsv("/csv/upload-clients-properties", file);

export const previewInvoicesCsv = async (file: File) =>
  postCsv("/csv/preview-invoices", file);

export const uploadInvoicesCsv = async (file: File) =>
  postCsv("/csv/upload-invoices", file);
