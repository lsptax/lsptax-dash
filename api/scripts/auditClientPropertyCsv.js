/**
 * Audit a client+property CSV (same shape as POST /csv/upload-clients-properties).
 * Core logic lives in `src/utils/clientPropertyCsvAudit.js` (also used by POST /csv/preview-clients-properties).
 *
 * Usage (from repo root):
 *   node scripts/auditClientPropertyCsv.js
 *   node scripts/auditClientPropertyCsv.js ./csv/your-file.csv
 *   node scripts/auditClientPropertyCsv.js ./csv/your-file.csv --out ./csv/reports
 *
 * Writes:
 *   <stem>.audit.json
 *   <stem>.audit.txt
 * next to the CSV (default) or under --out (same stem).
 */
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import {
  buildClientPropertyCsvAuditReport,
  formatClientPropertyCsvAuditHumanReadable,
} from "../src/utils/clientPropertyCsvAudit.js";

function parseArgs(argv) {
  const args = argv.slice(2);
  let outDir = null;
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--out") {
      outDir = args[i + 1];
      i++;
      continue;
    }
    positional.push(args[i]);
  }
  const csvPath =
    positional[0] ||
    path.join(process.cwd(), "csv", "Upload 14 May- final - Sheet4 (2).csv");
  return { csvPath: path.resolve(csvPath), outDir: outDir ? path.resolve(outDir) : null };
}

function main() {
  const { csvPath, outDir } = parseArgs(process.argv);
  if (!fs.existsSync(csvPath)) {
    console.error(`File not found: ${csvPath}`);
    process.exit(1);
  }

  const buf = fs.readFileSync(csvPath);
  const records = parse(buf, { columns: true, trim: true, relax_column_count: true });
  const physicalNewlineCount = buf.toString("utf8").split(/\r?\n/).length;
  const report = buildClientPropertyCsvAuditReport(records, {
    physicalNewlineCount,
    source: csvPath,
  });

  const stem = path.basename(csvPath, path.extname(csvPath));
  const targetDir = outDir || path.dirname(csvPath);
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

  const jsonPath = path.join(targetDir, `${stem}.audit.json`);
  const txtPath = path.join(targetDir, `${stem}.audit.txt`);

  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), "utf8");
  const text = formatClientPropertyCsvAuditHumanReadable(report);
  fs.writeFileSync(txtPath, text, "utf8");

  console.log(`Wrote ${jsonPath}`);
  console.log(`Wrote ${txtPath}`);
  console.log("");
  console.log(text);
}

main();
