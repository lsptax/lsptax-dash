import fs from "fs";
import path from "path";
import dotenv from "dotenv";

/**
 * Centralized env loading.
 *
 * - Local/dev: loads `.env`
 * - Production: loads `.env.production` if present (otherwise relies on injected env)
 *
 * Note: dotenv never overwrites already-set process.env values by default.
 */
export function loadEnv() {
  if (globalThis.__LSPTAX_ENV_LOADED) return;
  globalThis.__LSPTAX_ENV_LOADED = true;

  const nodeEnv = (process.env.NODE_ENV || "development").trim();
  const isProd = nodeEnv === "production";

  // Allow explicit override (useful for CI / staging / local testing)
  const filename = (process.env.ENV_FILE || "").trim() || (isProd ? ".env.production" : ".env");
  const envPath = path.resolve(process.cwd(), filename);

  if (fs.existsSync(envPath)) {
    // We intentionally override to ensure the selected env file wins in local runs.
    // In real production, you should inject env (Fly secrets / container env) and not ship a file.
    dotenv.config({ path: envPath, override: true });
  } else {
    // In real production we usually rely on injected env (Fly secrets, container env, etc.)
    // But if someone runs NODE_ENV=production locally without the file, this log helps.
    if (isProd) {
      console.warn(
        `${filename} not found; relying on injected environment variables.`
      );
    }
  }
}

// Load immediately on import (so importing this file is enough).
loadEnv();

