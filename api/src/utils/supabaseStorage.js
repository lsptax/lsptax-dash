import { getSupabase } from "./supabaseClient.js";

const CONTRACTS_BUCKET = "contracts";
const INVOICES_BUCKET = "invoices";

async function uploadPdfToBucket(bucket, buffer, storagePath) {
  const supabase = getSupabase();
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(storagePath, buffer, {
      contentType: "application/pdf",
      upsert: true,
    });
  if (error) {
    console.error(`Supabase upload error (${bucket}):`, error);
    throw error;
  }
  return data.path;
}

async function getSignedUrlFromBucket(bucket, storagePath, expiresInSeconds = 3600) {
  const supabase = getSupabase();
  const {
    data: { signedUrl },
    error,
  } = await supabase.storage.from(bucket).createSignedUrl(storagePath, expiresInSeconds);
  if (error) {
    console.error(`Supabase signed URL error (${bucket}):`, error);
    throw error;
  }
  return signedUrl;
}

/**
 * Upload a contract PDF buffer to Supabase Storage.
 * @param {Buffer} buffer - PDF file buffer
 * @param {string} storagePath - Path within bucket, e.g. "clients/123/signed/456-AOA-signed.pdf"
 * @returns {Promise<string>} - Storage path (use getSignedDownloadUrl for temporary URL)
 */
export async function uploadContractToSupabase(buffer, storagePath) {
  return uploadPdfToBucket(CONTRACTS_BUCKET, buffer, storagePath);
}

/**
 * Upload a sent invoice PDF buffer to Supabase Storage (private `invoices` bucket).
 * @param {Buffer} buffer
 * @param {string} storagePath
 * @returns {Promise<string>}
 */
export async function uploadInvoiceToSupabase(buffer, storagePath) {
  return uploadPdfToBucket(INVOICES_BUCKET, buffer, storagePath);
}

/**
 * Get a short-lived signed URL for downloading a stored contract (private bucket).
 * @param {string} storagePath - Path returned from uploadContractToSupabase
 * @param {number} expiresInSeconds - Default 3600 (1 hour)
 * @returns {Promise<string>} - Signed URL
 */
export async function getSignedDownloadUrl(
  storagePath,
  expiresInSeconds = 3600
) {
  return getSignedUrlFromBucket(CONTRACTS_BUCKET, storagePath, expiresInSeconds);
}

/**
 * Get a short-lived signed URL for a stored invoice PDF (private `invoices` bucket).
 */
export async function getInvoiceSignedDownloadUrl(storagePath, expiresInSeconds = 3600) {
  return getSignedUrlFromBucket(INVOICES_BUCKET, storagePath, expiresInSeconds);
}

/**
 * Build storage path for signed PDF (saved after DocuSign completion).
 * @param {number} clientId
 * @param {number} contractId
 * @param {"CLIENT_CONTRACT"|"AOA"} type
 */
export function signedContractPath(clientId, contractId, type) {
  return `clients/${clientId}/signed/${contractId}-${type}-signed.pdf`;
}

/**
 * Build storage path for a sent invoice PDF.
 * @param {number} clientId
 * @param {number|null} year
 * @param {string|number} batchKey - shared folder key for one send (e.g. Date.now())
 * @param {string} filename
 */
export function invoiceDeliveryStoragePath(clientId, year, batchKey, filename) {
  const safeName = String(filename).replace(/[^a-zA-Z0-9._-]/g, "_");
  const yearPart = year != null ? String(year) : "unknown";
  return `clients/${clientId}/invoices/${yearPart}/${batchKey}/${safeName}`;
}
