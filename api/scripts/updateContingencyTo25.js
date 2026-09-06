/**
 * Set contingency fee to 25% (or another allowed percent) on all clients, properties,
 * and invoices, then recalculate invoice derived amounts.
 *
 * Usage (from repo root):
 *   node scripts/updateContingencyTo25.js --dry-run
 *   node scripts/updateContingencyTo25.js
 *   node scripts/updateContingencyTo25.js --percent=25
 */
import "dotenv/config";
import prisma from "../prisma/prismaClient.js";
import { buildRecalculatedInvoicePatch } from "../src/utils/invoiceYearlyData.js";

function parseArgs(argv) {
  let dryRun = false;
  let percent = 25;
  for (const arg of argv.slice(2)) {
    if (arg === "--dry-run" || arg === "-n") dryRun = true;
    else if (arg.startsWith("--percent=")) {
      percent = parseFloat(arg.slice("--percent=".length));
    }
  }
  return { dryRun, percent };
}

function num(v) {
  return Number(v ?? 0);
}

function patchChanged(before, patch) {
  return (
    num(before.marketReduction) !== num(patch.marketReduction) ||
    num(before.appraisedReduction) !== num(patch.appraisedReduction) ||
    num(before.taxableSavings) !== num(patch.taxableSavings) ||
    num(before.invoiceAmount) !== num(patch.invoiceAmount) ||
    num(before.contingencyFee) !== num(patch.contingencyFee)
  );
}

async function main() {
  const { dryRun, percent } = parseArgs(process.argv);

  if (!Number.isFinite(percent) || percent < 0) {
    console.error("Invalid --percent value. Example: --percent=25");
    process.exit(1);
  }

  const percentStr = String(percent);
  const prefix = dryRun ? "[dry-run] " : "";

  const [clientCount, propertyCount, invoiceCount] = await Promise.all([
    prisma.client.count(),
    prisma.property.count(),
    prisma.invoice.count(),
  ]);

  console.log(
    `${prefix}Updating contingency to ${percent}% on ${clientCount} client(s), ${propertyCount} property(ies), ${invoiceCount} invoice(s)...`
  );

  if (!dryRun) {
    await prisma.client.updateMany({
      data: { contingencyFee: percent },
    });

    await prisma.property.updateMany({
      data: { contingencyFee: percentStr },
    });

    await prisma.invoice.updateMany({
      data: { contingencyFee: percent },
    });
  }

  const invoices = await prisma.invoice.findMany({
    orderBy: [{ propertyId: "asc" }, { year: "desc" }],
  });

  let recalculated = 0;
  let unchanged = 0;
  const samples = [];

  for (const invoice of invoices) {
    const patch = buildRecalculatedInvoicePatch(
      { ...invoice, contingencyFee: percent },
      percent
    );

    if (!patchChanged(invoice, patch)) {
      unchanged++;
      continue;
    }

    if (samples.length < 10) {
      samples.push({
        id: invoice.id,
        propertyId: invoice.propertyId,
        year: invoice.year,
        before: {
          contingencyFee: num(invoice.contingencyFee),
          invoiceAmount: num(invoice.invoiceAmount),
        },
        after: {
          contingencyFee: num(patch.contingencyFee),
          invoiceAmount: num(patch.invoiceAmount),
        },
      });
    }

    if (!dryRun) {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: patch,
      });
    }
    recalculated++;
  }

  console.log(
    `${prefix}Clients: ${clientCount} → ${percent}%`,
    `\n${prefix}Properties: ${propertyCount} → ${percentStr}`,
    `\n${prefix}Invoices: ${invoiceCount} contingency set to ${percent}%`,
    `\n${prefix}${dryRun ? "Would recalculate" : "Recalculated"} ${recalculated} invoice row(s); ${unchanged} unchanged.`
  );

  if (samples.length) {
    console.log("\nSample invoice changes:");
    for (const s of samples) {
      console.log(JSON.stringify(s));
    }
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
