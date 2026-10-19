/**
 * Set paymentMethod on paid invoices from payment notes.
 * Only fills a blank method. One category per note: Zelle, Cash, Check,
 * Credit Card, or Others (money order / bank bill).
 *
 *   node scripts/backfillPaymentMethodFromNotes.js
 */
import "dotenv/config";
import prisma from "../prisma/prismaClient.js";

const RULES = [
  { method: "ZELLE", pattern: /\bzelles?\b|\bzel\b/i },
  { method: "CASH", pattern: /\bcash\b/i },
  { method: "CHECK", pattern: /\bchec?ques?\b|\bchecks?\b|\bckecks?\b|\bchk\b|\bck\b|\bck#/i },
  {
    method: "CREDIT_CARD",
    pattern: /\bcredit\s*cards?\b|\bdebit\s*cards?\b|\bvisa\b|\bmastercard\b|\bmaster\s*card\b|\bamex\b|\bamerican\s+express\b|\bdiscover\b|\bcc\b/i,
  },
  { method: "OTHER", pattern: /\bmoney\s*orders?\b|\bbank\s+bill\b/i },
];

function cleanNote(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

async function main() {
  const rows = await prisma.invoice.findMany({
    where: { isPaid: true, paymentMethod: null },
    select: { id: true, paymentNotes: true },
    orderBy: { id: "asc" },
  });

  const idsByMethod = new Map(RULES.map((rule) => [rule.method, []]));
  for (const row of rows) {
    const note = cleanNote(row.paymentNotes);
    if (!note) continue;
    const hits = RULES.filter((rule) => rule.pattern.test(note));
    if (hits.length !== 1) continue;
    idsByMethod.get(hits[0].method).push(row.id);
  }

  const planned = [...idsByMethod.entries()].map(([method, ids]) => ({ method, count: ids.length }));
  const total = planned.reduce((sum, row) => sum + row.count, 0);
  console.log("Backfill plan:");
  for (const row of planned) console.log(`  ${row.method.padEnd(12)} ${row.count}`);
  console.log(`  ${"Total".padEnd(12)} ${total}`);

  const updated = await prisma.$transaction(
    planned
      .filter((row) => row.count > 0)
      .map((row) =>
        prisma.invoice.updateMany({
          where: {
            id: { in: idsByMethod.get(row.method) },
            isPaid: true,
            paymentMethod: null,
          },
          data: { paymentMethod: row.method },
        })
      )
  );

  const written = updated.reduce((sum, result) => sum + result.count, 0);
  console.log(`Updated ${written} invoices.`);

  const after = await prisma.invoice.groupBy({
    by: ["paymentMethod"],
    where: { isPaid: true },
    _count: { _all: true },
  });
  console.log("Paid invoices by payment method:");
  for (const row of after) {
    console.log(`  ${String(row.paymentMethod || "(blank)").padEnd(12)} ${row._count._all}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
