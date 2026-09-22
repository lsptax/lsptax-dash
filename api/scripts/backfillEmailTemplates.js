/**
 * Insert built-in invoice and payment acknowledgement email templates
 * when those rows are missing. Existing rows are left unchanged.
 *
 * Usage (from api/):
 *   node scripts/backfillEmailTemplates.js --dry-run
 *   node scripts/backfillEmailTemplates.js
 */
import "dotenv/config";
import prisma from "../prisma/prismaClient.js";
import { EMAIL_TEMPLATE_CATALOG } from "../src/utils/emailTemplateCatalog.js";

function parseArgs(argv) {
  return { dryRun: argv.includes("--dry-run") || argv.includes("-n") };
}

async function main() {
  const { dryRun } = parseArgs(process.argv);
  const prefix = dryRun ? "[dry-run] " : "";

  const existing = await prisma.emailTemplate.findMany({ select: { key: true } });
  const existingKeys = new Set(existing.map((row) => row.key));
  const missing = EMAIL_TEMPLATE_CATALOG.filter((template) => !existingKeys.has(template.key));

  if (!missing.length) {
    console.log(`${prefix}Email templates already present. Nothing to backfill.`);
    return;
  }

  for (const template of missing) {
    console.log(`${prefix}Inserting ${template.key} (${template.name})`);
    if (dryRun) continue;
    await prisma.emailTemplate.create({
    data: {
      key: template.key,
      name: template.name,
      purpose: template.purpose,
      isBuiltin: true,
      subject: template.subject,
      bodyHtml: template.bodyHtml,
    },
    });
  }

  console.log(
    `${prefix}${dryRun ? "Would insert" : "Inserted"} ${missing.length} email template(s).`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
