import { jsPDF } from "jspdf";

import brandLogo from "@/assets/invoice-logo.png";
import type { ClientInvoiceSummary, InvoiceSummaryRow } from "@/store/invoices";
import { formatUSD } from "@/utils/formatCurrency";
import { resolveInvoiceTemplate } from "@/utils/invoiceTemplate";
import { toSafeFilenamePart } from "@/components/portal/clients/invoice/InvoiceSheet2025";

const PT_TO_MM = 0.3528;
const MARGIN = 8;
const CELL_PAD_X = 1;
const CELL_PAD_Y = 1.2;
const BODY_FONT_PT = 7;
const HEADER_FONT_PT = 6.5;
const LINE_HEIGHT_FACTOR = 1.2;
/** Body rows are at least double the height of a single text line row. */
const MIN_BODY_ROW_HEIGHT = 10;
const HEADER_ROW_HEIGHT = 12;
const TOTAL_ROW_HEIGHT = 7;

type SummaryContext = { year: number; typeOfAcct: string };

type Column = {
  header: string;
  weight: number;
  value: (row: InvoiceSummaryRow, ctx: SummaryContext) => string;
};

const SERVICE_LABELS = { current: "Protest", arbitration: "Arbitration", homestead: "Homestead" };

const COLUMNS: Column[] = [
  { header: "Type of Acct", weight: 11, value: (_row, ctx) => ctx.typeOfAcct },
  { header: "Property Addresses", weight: 40, value: (row) => row.propertyAddress },
  { header: "County", weight: 14, value: (row) => row.county },
  { header: "Account Number", weight: 24, value: (row) => row.accountNumber },
  {
    header: "Invoice Type",
    weight: 17,
    value: (row, ctx) => `${ctx.year} ${SERVICE_LABELS[resolveInvoiceTemplate(row)]}`,
  },
  { header: "Notice Market Value", weight: 17, value: (row) => formatUSD(row.noticeMarketValue, false) },
  { header: "Final Market Value", weight: 17, value: (row) => formatUSD(row.finalMarketValue, false) },
  { header: "Market Value Reduction", weight: 15, value: (row) => formatUSD(row.marketReduction, false) },
  { header: "Notice Appraised Value", weight: 17, value: (row) => formatUSD(row.noticeAppraisedValue, false) },
  { header: "Final Appraised Value", weight: 17, value: (row) => formatUSD(row.finalAppraisedValue, false) },
  { header: "Appraised Value Reduction", weight: 15, value: (row) => formatUSD(row.appraisedReduction, false) },
  { header: "Overall Tax Rate", weight: 13, value: (row) => `${row.taxRate.toFixed(4)}%` },
  { header: "Tax Savings", weight: 15, value: (row) => formatUSD(row.taxableSavings) },
  { header: "Contingency (%)", weight: 13, value: (row) => `${row.contingencyFee}%` },
  { header: "Contingency Fee Due", weight: 16, value: (row) => formatUSD(row.invoiceAmount) },
  { header: "Paid", weight: 9, value: (row) => (row.paid ? "Yes" : "No") },
];

function lineHeight(fontPt: number) {
  return fontPt * PT_TO_MM * LINE_HEIGHT_FACTOR;
}

async function loadImageDataUrl(src: string): Promise<string | null> {
  try {
    const blob = await (await fetch(src)).blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function drawHeader(doc: jsPDF, summary: ClientInvoiceSummary, logo: string | null): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const boxHeight = 32;
  const top = MARGIN;

  doc.setLineWidth(0.5);
  doc.rect(MARGIN, top, pageWidth - MARGIN * 2, boxHeight);

  if (logo) {
    doc.addImage(logo, "PNG", MARGIN + 3, top + 5, 25, (25 * 150) / 168);
  }

  const companyX = MARGIN + 34;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("LONE STAR PROPERTY TAX", companyX, top + 6);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  ["16107 KENSINGTON DRIVE, STE. 194", "SUGARLAND, TX 77479", "info@lsptax.com", "832-847-3911"].forEach(
    (line, index) => doc.text(line, companyX, top + 11.5 + index * 4.5)
  );

  doc.text(summary.client.clientNumber || "", pageWidth * 0.62, top + 6);

  const clientX = pageWidth * 0.7;
  const clientWidth = pageWidth - MARGIN - 3 - clientX;
  const clientLines = [
    summary.client.clientName,
    summary.client.mailingAddress,
    summary.client.mailingAddressCityTxZip,
  ]
    .filter(Boolean)
    .flatMap((line) => doc.splitTextToSize(line, clientWidth) as string[]);
  clientLines.forEach((line, index) => doc.text(line, clientX, top + 6 + index * 4.5));

  return top + boxHeight + 6;
}

function drawCell(
  doc: jsPDF,
  lines: string[],
  x: number,
  y: number,
  width: number,
  height: number,
  fontPt: number
) {
  doc.rect(x, y, width, height);
  const lh = lineHeight(fontPt);
  const blockHeight = lines.length * lh;
  const firstBaseline = y + (height - blockHeight) / 2 + fontPt * PT_TO_MM * 0.85;
  lines.forEach((line, index) => doc.text(line, x + CELL_PAD_X, firstBaseline + index * lh));
}

function drawTableHeader(doc: jsPDF, widths: number[], y: number): number {
  doc.setLineWidth(0.2);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(HEADER_FONT_PT);
  let x = MARGIN;
  COLUMNS.forEach((column, index) => {
    const available = widths[index] - CELL_PAD_X * 2;
    doc.setFontSize(HEADER_FONT_PT);
    const widestWord = Math.max(...column.header.split(/\s+/).map((word) => doc.getTextWidth(word)));
    const fontPt =
      widestWord > available ? HEADER_FONT_PT * (available / widestWord) * 0.96 : HEADER_FONT_PT;
    doc.setFontSize(fontPt);
    const lines = doc.splitTextToSize(column.header, available) as string[];
    drawCell(doc, lines, x, y, widths[index], HEADER_ROW_HEIGHT, fontPt);
    x += widths[index];
  });
  return y + HEADER_ROW_HEIGHT;
}

export async function buildInvoiceSummaryPdf(summary: ClientInvoiceSummary): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const tableWidth = pageWidth - MARGIN * 2;
  const totalWeight = COLUMNS.reduce((sum, column) => sum + column.weight, 0);
  const widths = COLUMNS.map((column) => (column.weight / totalWeight) * tableWidth);
  const ctx: SummaryContext = { year: summary.year, typeOfAcct: summary.client.typeOfAcct };

  const logo = await loadImageDataUrl(brandLogo);
  let y = drawTableHeader(doc, widths, drawHeader(doc, summary, logo));

  const lh = lineHeight(BODY_FONT_PT);
  for (const row of summary.rows) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(BODY_FONT_PT);
    const cells = COLUMNS.map(
      (column, index) =>
        doc.splitTextToSize(column.value(row, ctx) || "", widths[index] - CELL_PAD_X * 2) as string[]
    );
    const maxLines = Math.max(...cells.map((lines) => lines.length));
    const rowHeight = Math.max(MIN_BODY_ROW_HEIGHT, maxLines * lh + CELL_PAD_Y * 2);

    if (y + rowHeight > pageHeight - MARGIN) {
      doc.addPage();
      y = drawTableHeader(doc, widths, MARGIN);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(BODY_FONT_PT);
    }

    let x = MARGIN;
    cells.forEach((lines, index) => {
      drawCell(doc, lines, x, y, widths[index], rowHeight, BODY_FONT_PT);
      x += widths[index];
    });
    y += rowHeight;
  }

  if (y + TOTAL_ROW_HEIGHT > pageHeight - MARGIN) {
    doc.addPage();
    y = MARGIN;
  }
  const feeColumnIndex = COLUMNS.findIndex((column) => column.header === "Contingency Fee Due");
  const printedTotal =
    Math.round(summary.rows.reduce((sum, row) => sum + Math.round(row.invoiceAmount * 100), 0)) / 100;
  doc.setLineWidth(0.2);
  doc.setFontSize(BODY_FONT_PT);
  let totalX = MARGIN;
  COLUMNS.forEach((_column, index) => {
    const label =
      index === feeColumnIndex - 1 ? "Total" : index === feeColumnIndex ? formatUSD(printedTotal) : "";
    doc.setFont("helvetica", "bold");
    drawCell(doc, label ? [label] : [], totalX, y, widths[index], TOTAL_ROW_HEIGHT, BODY_FONT_PT);
    totalX += widths[index];
  });

  return doc;
}

export function buildInvoiceSummaryFilename(summary: ClientInvoiceSummary): string {
  const numberPart = toSafeFilenamePart(summary.client.clientNumber || String(summary.client.id));
  const namePart = toSafeFilenamePart(summary.client.clientName || "client");
  return `${numberPart}-invoice-summary-${namePart}-${summary.year}.pdf`;
}

export async function downloadInvoiceSummaryPdf(summary: ClientInvoiceSummary): Promise<void> {
  const doc = await buildInvoiceSummaryPdf(summary);
  doc.save(buildInvoiceSummaryFilename(summary));
}
