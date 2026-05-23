import { getSupabase } from "./supabaseClient.js";

const BUCKET = "contracts";

/**
 * Upload a contract PDF buffer to Supabase Storage.
 * @param {Buffer} buffer - PDF file buffer
 * @param {string} storagePath - Path within bucket, e.g. "clients/123/signed/456-AOA-signed.pdf"
 * @returns {Promise<string>} - Storage path (use getSignedDownloadUrl for temporary URL)
 */
export async function uploadContractToSupabase(buffer, storagePath) {
  const supabase = getSupabase();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: "application/pdf",
      upsert: true,
    });
  if (error) {
    console.error("Supabase upload error:", error);
    throw error;
  }
  return data.path;
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
  const supabase = getSupabase();
  const {
    data: { signedUrl },
    error,
  } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, expiresInSeconds);
  if (error) {
    console.error("Supabase signed URL error:", error);
    throw error;
  }
  return signedUrl;
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
