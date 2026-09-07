import prisma from "../../prisma/prismaClient.js";

/** Safer, non-secret fields only. API keys and webhook secrets stay in env. */
export const SETTING_FIELDS = {
  BREVO_INVOICE_SENDER_EMAIL: { group: "brevo", jsonKey: "senderEmail", required: true },
  BREVO_INVOICE_SENDER_NAME: { group: "brevo", jsonKey: "senderName" },
  BREVO_SMS_SENDER: { group: "brevo", jsonKey: "smsSender" },
  INVOICE_EMAIL_LOGO_URL: { group: "brevo", jsonKey: "invoiceLogoUrl" },

  SUPABASE_URL: { group: "supabase", jsonKey: "url", required: true },

  DOCUSIGN_AUTH_SERVER: { group: "docusign", jsonKey: "authServer", required: true },
  DOCUSIGN_REST_BASE_URL: { group: "docusign", jsonKey: "restBaseUrl", required: true },
  DOCUSIGN_ALLOW_DEMO_IN_PRODUCTION: {
    group: "docusign",
    jsonKey: "allowDemoInProduction",
    type: "flag1",
  },
  ALLOW_MULTIPLE_CLIENT_CONTRACT_SENDS: {
    group: "docusign",
    jsonKey: "allowMultipleClientContractSends",
    type: "bool",
  },
  ALLOW_MULTIPLE_AOA_SENDS: {
    group: "docusign",
    jsonKey: "allowMultipleAoaSends",
    type: "bool",
  },
};

const MAX_VALUE_LENGTH = 4000;

function envValue(key) {
  const raw = process.env[key] ?? "";
  if (key === "DOCUSIGN_REST_BASE_URL" && !String(raw).trim()) {
    return "https://demo.docusign.net/restapi";
  }
  return raw;
}

function readTypedValue(key, field) {
  const raw = envValue(key);
  if (field.type === "flag1") return raw === "1";
  if (field.type === "bool") return String(raw || "true").toLowerCase() !== "false";
  return String(raw);
}

export function serializeSettings() {
  const groups = { brevo: {}, supabase: {}, docusign: {} };
  for (const [key, field] of Object.entries(SETTING_FIELDS)) {
    groups[field.group][field.jsonKey] = readTypedValue(key, field);
  }
  return groups;
}

function toStoredValue(field, value) {
  if (field.type === "flag1") return value ? "1" : "";
  if (field.type === "bool") return value ? "true" : "false";
  return String(value ?? "").trim();
}

/**
 * Map a PATCH body `{ brevo: { senderEmail }, ... }` to env key/value pairs.
 * Unknown or secret keys are ignored.
 */
export function parseSettingsPatch(body = {}) {
  const updates = [];
  const errors = [];

  for (const [key, field] of Object.entries(SETTING_FIELDS)) {
    const group = body[field.group];
    if (!group || typeof group !== "object" || !(field.jsonKey in group)) continue;

    const incoming = group[field.jsonKey];
    if (field.type === "flag1" || field.type === "bool") {
      updates.push({ key, value: toStoredValue(field, Boolean(incoming)) });
      continue;
    }

    const next = String(incoming ?? "").trim();
    if (!next && field.required) {
      errors.push(`${field.jsonKey} cannot be empty`);
      continue;
    }
    if (next.length > MAX_VALUE_LENGTH) {
      errors.push(`${field.jsonKey} is too long`);
      continue;
    }
    updates.push({ key, value: next });
  }

  return { updates, errors };
}

export function applySettingValues(updates) {
  for (const { key, value } of updates) {
    if (!SETTING_FIELDS[key]) continue;
    process.env[key] = value;
  }
}

export async function applyAppSettingsFromDb() {
  const rows = await prisma.appSetting.findMany();
  const allowed = rows.filter((row) => SETTING_FIELDS[row.key]);
  const extraKeys = rows.filter((row) => !SETTING_FIELDS[row.key]).map((row) => row.key);
  if (extraKeys.length) {
    await prisma.appSetting.deleteMany({ where: { key: { in: extraKeys } } });
  }
  applySettingValues(allowed.map((row) => ({ key: row.key, value: row.value })));
  return allowed.length;
}

export async function saveAppSettings(updates, userId) {
  if (!updates.length) return serializeSettings();

  await prisma.$transaction(
    updates.map((row) =>
      prisma.appSetting.upsert({
        where: { key: row.key },
        create: { key: row.key, value: row.value, updatedBy: userId ?? null },
        update: { value: row.value, updatedBy: userId ?? null },
      })
    )
  );
  applySettingValues(updates);
  return serializeSettings();
}
