/**
 * Verify PDF templates: list AcroForm field names so you can confirm
 * mappings in pdfFieldMappings.js match the actual PDFs.
 *
 * Run: node scripts/verify-pdf-templates.js
 *
 * For "Sign Here" text: open each PDF and use Find (Ctrl+F / Cmd+F) for "Sign Here".
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PDFDocument } from "pdf-lib";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = path.resolve(__dirname, "../src/template-pdfs");
const AOA_PATH = path.join(TEMPLATE_DIR, "50-162.pdf");
const CONTRACT_PATH = path.join(TEMPLATE_DIR, "contract.pdf");

function getFieldNames(pdfDoc) {
  const form = pdfDoc.getForm();
  const fields = form.getFields();
  return fields.map((f) => f.getName());
}

async function verifyPdf(label, pdfPath) {
  if (!fs.existsSync(pdfPath)) {
    console.warn(`⚠️  ${label}: file not found at ${pdfPath}`);
    return;
  }
  const bytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(bytes);
  const names = getFieldNames(pdfDoc);
  console.log(`\n${label} (${path.basename(pdfPath)})\n  Form field names (${names.length} total):`);
  names.sort().forEach((name) => console.log(`    - ${JSON.stringify(name)}`));

  return names;
}

async function main() {
  console.log("PDF template verification");
  console.log("─────────────────────────");

  const aoaNames = await verifyPdf("AOA (50-162)", AOA_PATH);
  const contractNames = await verifyPdf("Contract", CONTRACT_PATH);

  console.log("\n─────────────────────────");
  console.log("Checklist:");
  if (aoaNames) {
    const hasDate = aoaNames.some((n) => n.includes("Date Agents Authority Ends") || n === "Date Agents Authority Ends");
    const hasTitle = aoaNames.some((n) => n === "Title");
    console.log(`  AOA has "Date Agents Authority Ends": ${hasDate ? "✓" : "✗ (exact name may differ)"}`);
    console.log(`  AOA has "Title": ${hasTitle ? "✓" : "✗ (exact name may differ)"}`);
  }
  console.log('  "Sign Here" text: open each PDF and Find (Ctrl+F / Cmd+F) for "Sign Here" to confirm placement.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
