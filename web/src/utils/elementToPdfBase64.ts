import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

const MM_PER_PX = 0.264583;

/**
 * Renders a DOM element to a letter-size PDF and returns raw base64 (no data URI prefix).
 */
export async function elementToPdfBase64(element: HTMLElement): Promise<string> {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
  });

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const imgWidthMm = canvas.width * MM_PER_PX;
  const imgHeightMm = canvas.height * MM_PER_PX;
  const scale = Math.min(pageWidth / imgWidthMm, pageHeight / imgHeightMm);
  const renderWidth = imgWidthMm * scale;
  const renderHeight = imgHeightMm * scale;
  const offsetX = (pageWidth - renderWidth) / 2;
  const offsetY = 0;

  const imgData = canvas.toDataURL("image/jpeg", 0.92);
  pdf.addImage(imgData, "JPEG", offsetX, offsetY, renderWidth, renderHeight);

  const dataUri = pdf.output("datauristring");
  const commaIndex = dataUri.indexOf(",");
  return commaIndex >= 0 ? dataUri.slice(commaIndex + 1) : dataUri;
}

export async function elementsToPdfAttachments(
  elements: Array<{ element: HTMLElement; filename: string }>
): Promise<Array<{ filename: string; contentBase64: string }>> {
  const attachments: Array<{ filename: string; contentBase64: string }> = [];
  for (const { element, filename } of elements) {
    const contentBase64 = await elementToPdfBase64(element);
    attachments.push({ filename, contentBase64 });
  }
  return attachments;
}
