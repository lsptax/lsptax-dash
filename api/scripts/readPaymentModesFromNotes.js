/**
 * Read invoice payment notes and report which payment modes they mention.
 * Does not write to the database.
 *
 *   node scripts/readPaymentModesFromNotes.js
 *   node scripts/readPaymentModesFromNotes.js --samples=5
 */
import "dotenv/config";
import prisma from "../prisma/prismaClient.js";

const MODES = [
  {
    mode: "Zelle",
    pattern: /\bzelles?\b|\bzel\b/i,
  },
  {
    mode: "Cash",
    pattern: /\bcash\b/i,
  },
  {
    mode: "Check",
    pattern: /\bchec?ques?\b|\bchecks?\b|\bckecks?\b|\bchk\b|\bck\b|\bck#/i,
  },
  {
    mode: "Credit Card",
    pattern: /\bcredit\s*cards?\b|\bdebit\s*cards?\b|\bvisa\b|\bmastercard\b|\bmaster\s*card\b|\bamex\b|\bamerican\s+express\b|\bdiscover\b|\bcc\b/i,
  },
  {
    mode: "Venmo",
    pattern: /\bvenmo\b/i,
  },
  {
    mode: "PayPal",
    pattern: /\bpaypal\b/i,
  },
  {
    mode: "Wire",
    pattern: /\bwire\b|\bach\b|\bbank\s+transfer\b/i,
  },
  {
    mode: "Apple Pay",
    pattern: /\bapple\s*pay\b/i,
  },
  {
    mode: "Square",
    pattern: /\bsquare\b/i,
  },
  {
    mode: "Money order",
    pattern: /\bmoney\s*orders?\b/i,
  },
  {
    mode: "Bank bill",
    pattern: /\bbank\s+bill\b/i,
  },
];

const NOISE = new Set([
  "paid",
  "payment",
  "pay",
  "via",
  "by",
  "the",
  "a",
  "an",
  "on",
  "of",
  "for",
  "to",
  "and",
  "in",
  "from",
  "with",
  "invoice",
  "inv",
  "fee",
  "fees",
  "received",
  "recd",
  "rec",
  "pd",
  "pmt",
  "note",
  "notes",
  "full",
  "partial",
  "balance",
  "amount",
  "amt",
]);

function parseArgs(argv) {
  let samples = 8;
  for (const arg of argv.slice(2)) {
    if (arg.startsWith("--samples=")) {
      const n = Number(arg.slice("--samples=".length));
      if (Number.isInteger(n) && n >= 0) samples = n;
    }
  }
  return { samples };
}

function cleanNote(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function modesInNote(note) {
  return MODES.filter((entry) => entry.pattern.test(note)).map((entry) => entry.mode);
}

function leftoverPhrase(note) {
  const stripped = note
    .toLowerCase()
    .replace(/\$[\d,]+(?:\.\d+)?/g, " ")
    .replace(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g, " ")
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, " ")
    .replace(/[#*_.,:;()[\]/\\+-]+/g, " ")
    .replace(/\b\d+\b/g, " ");
  const words = stripped
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word && !NOISE.has(word) && word.length > 1);
  return words.join(" ");
}

function printGroup(title, rows, samples) {
  console.log(`\n${title} (${rows.length})`);
  if (!rows.length) return;
  const shown = samples === 0 ? rows : rows.slice(0, samples);
  for (const row of shown) {
    const where = `#${row.id} ${row.year || ""}`.trim();
    console.log(`  ${where}  ${row.note}`);
  }
  if (samples > 0 && rows.length > samples) {
    console.log(`  … ${rows.length - samples} more`);
  }
}

async function main() {
  const { samples } = parseArgs(process.argv);
  const invoices = await prisma.invoice.findMany({
    where: {
      paymentNotes: { not: null },
      NOT: { paymentNotes: "" },
    },
    select: {
      id: true,
      year: true,
      paymentNotes: true,
      isPaid: true,
      paymentMethod: true,
    },
    orderBy: { id: "asc" },
  });

  const noted = invoices
    .map((row) => ({ ...row, note: cleanNote(row.paymentNotes) }))
    .filter((row) => row.note);

  const byMode = new Map(MODES.map((entry) => [entry.mode, []]));
  const ambiguous = [];
  const unmatched = [];

  for (const row of noted) {
    const modes = modesInNote(row.note);
    if (modes.length === 1) byMode.get(modes[0]).push(row);
    else if (modes.length > 1) ambiguous.push({ ...row, modes });
    else unmatched.push(row);
  }

  const matchedCount = noted.length - unmatched.length;
  console.log(`Invoices with payment notes: ${noted.length}`);
  console.log(`Notes that name a payment mode: ${matchedCount}`);
  console.log(`Notes with no recognized mode: ${unmatched.length}`);
  console.log("\nModes found in notes:");
  for (const entry of MODES) {
    const rows = byMode.get(entry.mode);
    const also = ambiguous.filter((row) => row.modes.includes(entry.mode)).length;
    const extra = also ? ` (+${also} also naming another mode)` : "";
    console.log(`  ${entry.mode.padEnd(14)} ${String(rows.length).padStart(5)}${extra}`);
  }
  if (ambiguous.length) {
    console.log(`  ${"More than one".padEnd(14)} ${String(ambiguous.length).padStart(5)}`);
  }

  for (const entry of MODES) {
    printGroup(entry.mode, byMode.get(entry.mode), samples);
  }
  printGroup(
    "More than one mode",
    ambiguous.map((row) => ({ ...row, note: `${row.modes.join(" + ")} — ${row.note}` })),
    samples
  );

  const leftoverCounts = new Map();
  for (const row of unmatched) {
    const phrase = leftoverPhrase(row.note) || "(dates or amounts only)";
    const bucket = leftoverCounts.get(phrase) || { phrase, count: 0, sample: row.note };
    bucket.count += 1;
    leftoverCounts.set(phrase, bucket);
  }
  const leftovers = [...leftoverCounts.values()].sort((a, b) => b.count - a.count || a.phrase.localeCompare(b.phrase));
  console.log(`\nUnmatched note phrases (${leftovers.length} distinct)`);
  for (const bucket of leftovers.slice(0, 40)) {
    console.log(`  ${String(bucket.count).padStart(4)}  ${bucket.phrase}`);
    if (bucket.sample.toLowerCase() !== bucket.phrase) {
      console.log(`        e.g. ${bucket.sample}`);
    }
  }
  if (leftovers.length > 40) console.log(`  … ${leftovers.length - 40} more phrases`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
