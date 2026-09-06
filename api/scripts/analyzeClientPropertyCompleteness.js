/**
 * Analyze field-level completeness for Client and Property records in the DB.
 *
 * Usage (from repo root, DATABASE_URL required):
 *   node scripts/analyzeClientPropertyCompleteness.js
 *   node scripts/analyzeClientPropertyCompleteness.js --out ./csv/reports
 *   node scripts/analyzeClientPropertyCompleteness.js --json-only
 */
import fs from "fs";
import path from "path";
import "dotenv/config";
import prisma from "../prisma/prismaClient.js";
import {
  buildClientPropertyCompletenessReport,
  formatClientPropertyCompletenessHumanReadable,
} from "../src/utils/clientPropertyCompleteness.js";

function parseArgs(argv) {
  const args = argv.slice(2);
  let outDir = null;
  let jsonOnly = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--out") {
      outDir = path.resolve(args[i + 1]);
      i++;
      continue;
    }
    if (args[i] === "--json-only") jsonOnly = true;
  }
  return { outDir, jsonOnly };
}

async function main() {
  const { outDir, jsonOnly } = parseArgs(process.argv);

  const [clients, properties] = await Promise.all([
    prisma.client.findMany({
      where: { type: "CLIENT" },
      select: {
        id: true,
        clientNumber: true,
        clientName: true,
        nameOnCad: true,
        typeOfAcct: true,
        email: true,
        billingEmail: true,
        phoneNumber: true,
        mailingAddress: true,
        mailingAddressCityTxZip: true,
        billingAddress: true,
        contingencyFee: true,
        flatFee: true,
      },
      orderBy: { id: "asc" },
    }),
    prisma.property.findMany({
      where: { client: { type: "CLIENT" } },
      select: {
        id: true,
        accountNumber: true,
        clientNumber: true,
        nameOnCad: true,
        propertyAddress: true,
        mailingAddress: true,
        mailingAddressCityTxZip: true,
        cadMailingAddress: true,
        cadCity: true,
        cadZipCode: true,
        cadCounty: true,
        bppFee: true,
        flatFee: true,
      },
      orderBy: { id: "asc" },
    }),
  ]);

  const report = buildClientPropertyCompletenessReport({ clients, properties });
  const text = formatClientPropertyCompletenessHumanReadable(report);

  if (outDir) {
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const stamp = report.generatedAt.replace(/[:.]/g, "-");
    const jsonPath = path.join(outDir, `completeness-${stamp}.json`);
    const txtPath = path.join(outDir, `completeness-${stamp}.txt`);
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf8");
    fs.writeFileSync(txtPath, text, "utf8");
    console.log(`Wrote ${jsonPath}`);
    console.log(`Wrote ${txtPath}`);
    console.log("");
  }

  if (jsonOnly) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(text);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
