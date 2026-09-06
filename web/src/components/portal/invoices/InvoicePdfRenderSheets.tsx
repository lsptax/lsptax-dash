import { MutableRefObject } from "react";

import InvoiceSheet2025 from "../clients/invoice/InvoiceSheet2025";
import type { InvoicePdfRenderJob } from "@/utils/bulkInvoicePdf";

type InvoicePdfRenderSheetsProps = {
  jobs: InvoicePdfRenderJob[];
  sheetRefs: MutableRefObject<Map<string, HTMLDivElement>>;
};

export function InvoicePdfRenderSheets({ jobs, sheetRefs }: InvoicePdfRenderSheetsProps) {
  if (jobs.length === 0) return null;

  return (
    <div className="fixed left-[-10000px] top-0 w-[950px] pointer-events-none" aria-hidden>
      {jobs.map((job) => (
        <InvoiceSheet2025
          key={job.key}
          ref={(node) => {
            if (node) sheetRefs.current.set(job.key, node);
            else sheetRefs.current.delete(job.key);
          }}
          client={job.client}
          property={job.property}
          yearInvoice={job.yearInvoice}
          selectedYear={job.selectedYear}
          invoiceDate={job.invoiceDate}
          dueDate={job.dueDate}
        />
      ))}
    </div>
  );
}
