import prisma from "../../prisma/prismaClient.js";
import {
  EMAIL_TEMPLATE_CATALOG,
  getEmailTemplateDefinition,
  placeholdersForEmailTemplatePurpose,
  resolveEmailTemplatePurpose,
  starterForEmailTemplatePurpose,
  UNASSIGNED_EMAIL_TEMPLATE_PURPOSE,
  validateEmailTemplateInput,
} from "../utils/emailTemplateCatalog.js";

const cache = new Map();
const NAME_MAX = 80;

export function clearEmailTemplateCache() {
  cache.clear();
}

function purposePlaceholders(purpose) {
  return placeholdersForEmailTemplatePurpose(purpose);
}

function serializeTemplate(definition, row) {
  const purpose = row?.purpose || definition?.purpose;
  return {
    key: row?.key || definition.key,
    name: row?.name || definition.name,
    purpose,
    isBuiltin: row?.isBuiltin ?? Boolean(definition),
    description: definition?.description || null,
    subject: row?.subject ?? definition?.subject ?? "",
    bodyHtml: row?.bodyHtml ?? definition?.bodyHtml ?? "",
    placeholders: purposePlaceholders(purpose),
    updatedAt: row?.updatedAt ?? null,
  };
}

function toStoredTemplate(definition, row) {
  return {
    key: row?.key || definition?.key,
    purpose: row?.purpose || definition?.purpose,
    subject: row?.subject ?? definition?.subject ?? "",
    bodyHtml: row?.bodyHtml ?? definition?.bodyHtml ?? "",
  };
}

function matchesRequestedPurpose(templatePurpose, requestedPurpose) {
  if (!requestedPurpose) return true;
  return (
    templatePurpose === requestedPurpose ||
    templatePurpose === UNASSIGNED_EMAIL_TEMPLATE_PURPOSE
  );
}

export async function getStoredEmailTemplate(key, { purpose } = {}) {
  const definition = getEmailTemplateDefinition(key);
  if (cache.has(key)) {
    const cached = cache.get(key);
    if (!matchesRequestedPurpose(cached.purpose, purpose)) {
      throw new Error("That template is not assigned to this email type");
    }
    return cached;
  }

  try {
    const row = await prisma.emailTemplate.findUnique({ where: { key } });
    if (!row && !definition) {
      throw new Error("Unknown email template");
    }
    const template = toStoredTemplate(definition, row);
    if (!matchesRequestedPurpose(template.purpose, purpose)) {
      throw new Error("That template is not assigned to this email type");
    }
    cache.set(key, template);
    return template;
  } catch (error) {
    if (error?.message === "Unknown email template" || error?.message?.includes("not assigned")) {
      throw error;
    }
    console.error(`Failed to load email template ${key}; using the built-in copy`, error);
    if (!definition) throw error;
    return toStoredTemplate(definition, null);
  }
}

export async function listEmailTemplates() {
  const rows = await prisma.emailTemplate.findMany({
    orderBy: [{ isBuiltin: "desc" }, { name: "asc" }],
  });
  const byKey = new Map(rows.map((row) => [row.key, row]));
  const listed = new Set();
  const templates = [];

  for (const definition of EMAIL_TEMPLATE_CATALOG) {
    listed.add(definition.key);
    templates.push(serializeTemplate(definition, byKey.get(definition.key)));
  }

  for (const row of rows) {
    if (listed.has(row.key)) continue;
    templates.push(serializeTemplate(null, row));
  }

  return templates;
}

function validateName(name) {
  const next = typeof name === "string" ? name.trim() : "";
  if (!next) return { name: "", error: "Template name is required" };
  if (next.length > NAME_MAX) return { name: "", error: `Name must be ${NAME_MAX} characters or fewer` };
  return { name: next, error: null };
}

async function writeTemplate(key, data) {
  const row = await prisma.emailTemplate.upsert({
    where: { key },
    create: { key, ...data },
    update: data,
  });
  cache.delete(key);
  const definition = getEmailTemplateDefinition(key);
  return serializeTemplate(definition, row);
}

export async function updateEmailTemplate(key, input, updatedBy = null) {
  const definition = getEmailTemplateDefinition(key);
  const existing = await prisma.emailTemplate.findUnique({ where: { key } });
  if (!existing && !definition) return { error: "Unknown email template", status: 404 };

  const { subject, bodyHtml, errors } = validateEmailTemplateInput(input);
  if (errors.length) return { error: errors[0], status: 400 };

  const isBuiltin = existing?.isBuiltin ?? Boolean(definition);
  const nameResult = input?.name == null && definition
    ? { name: existing?.name || definition.name, error: null }
    : validateName(input?.name ?? existing?.name ?? definition?.name);
  if (nameResult.error) return { error: nameResult.error, status: 400 };

  let purpose = existing?.purpose || definition?.purpose;
  if (input && Object.prototype.hasOwnProperty.call(input, "purpose") && input.purpose !== purpose) {
    if (isBuiltin) return { error: "Built-in templates keep their assignment", status: 400 };
    const nextPurpose = resolveEmailTemplatePurpose(input.purpose);
    if (!nextPurpose) {
      return { error: "Choose unassigned, invoice sending, or payment acknowledgement", status: 400 };
    }
    purpose = nextPurpose;
  }

  const template = await writeTemplate(key, {
    name: nameResult.name,
    purpose,
    isBuiltin,
    subject,
    bodyHtml,
    updatedBy,
  });
  return { template };
}

export async function createEmailTemplate(input, updatedBy = null) {
  const purpose = resolveEmailTemplatePurpose(input?.purpose, { allowMissing: true });
  if (!purpose) {
    return { error: "Choose unassigned, invoice sending, or payment acknowledgement", status: 400 };
  }
  const nameResult = validateName(input?.name);
  if (nameResult.error) return { error: nameResult.error, status: 400 };

  const starter = starterForEmailTemplatePurpose(purpose);
  const subjectInput = typeof input?.subject === "string" ? input.subject : starter?.subject;
  const bodyInput = typeof input?.bodyHtml === "string" ? input.bodyHtml : starter?.bodyHtml;
  const { subject, bodyHtml, errors } = validateEmailTemplateInput({
    subject: subjectInput,
    bodyHtml: bodyInput,
  });
  if (errors.length) return { error: errors[0], status: 400 };

  const key = `custom_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const template = await writeTemplate(key, {
    name: nameResult.name,
    purpose,
    isBuiltin: false,
    subject,
    bodyHtml,
    updatedBy,
  });
  return { template };
}

export async function deleteEmailTemplate(key) {
  const definition = getEmailTemplateDefinition(key);
  const existing = await prisma.emailTemplate.findUnique({ where: { key } });
  if (!existing && !definition) return { error: "Unknown email template", status: 404 };
  if (existing?.isBuiltin || definition) {
    return { error: "Built-in templates cannot be deleted", status: 400 };
  }
  await prisma.emailTemplate.delete({ where: { key } });
  cache.delete(key);
  return { ok: true };
}

export async function resetEmailTemplate(key, updatedBy = null) {
  const definition = getEmailTemplateDefinition(key);
  if (!definition) return { error: "Only built-in templates can be restored", status: 400 };

  const template = await writeTemplate(key, {
    name: definition.name,
    purpose: definition.purpose,
    isBuiltin: true,
    subject: definition.subject,
    bodyHtml: definition.bodyHtml,
    updatedBy,
  });
  return { template };
}
