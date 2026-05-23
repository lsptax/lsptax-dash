#!/usr/bin/env node
/**
 * Ensures api/.env exists before install.
 * Prefers copying from ../new-backend/.env (sibling repo), else api/.env.example.
 */
import { copyFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const apiEnv = join(root, "api", ".env");
const apiExample = join(root, "api", ".env.example");
const legacyEnv = join(root, "..", "new-backend", ".env");

if (existsSync(apiEnv)) {
  console.log("api/.env already exists — skipping setup:env");
  process.exit(0);
}

if (existsSync(legacyEnv)) {
  copyFileSync(legacyEnv, apiEnv);
  console.log("Created api/.env from ../new-backend/.env");
  process.exit(0);
}

if (existsSync(apiExample)) {
  copyFileSync(apiExample, apiEnv);
  console.log(
    "Created api/.env from api/.env.example — set DATABASE_URL and other secrets before running the API"
  );
  process.exit(0);
}

console.warn("setup:env: no source found; create api/.env manually");
process.exit(0);
