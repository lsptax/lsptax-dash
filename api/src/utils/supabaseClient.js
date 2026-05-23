import { createClient } from "@supabase/supabase-js";

let cached = null;
let cachedKey = null;

/**
 * Get a singleton Supabase client for server-side usage.
 * Prefers SUPABASE_SERVICE_ROLE_KEY if available, otherwise SUPABASE_KEY.
 */
export function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_KEY (or SUPABASE_SERVICE_ROLE_KEY) are required");
  }
  const cacheId = `${url}::${key}`;
  if (cached && cachedKey === cacheId) return cached;
  cached = createClient(url, key);
  cachedKey = cacheId;
  return cached;
}

