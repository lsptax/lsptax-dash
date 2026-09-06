import React from "react";

import { getBppInvoiceAmount } from "@/utils/bppInvoice";
import { getFlatFeeAmount } from "@/utils/flatFee";
import { formatUSD } from "@/utils/formatCurrency";
import { ClientData, Invoice, InvoiceProperty } from "@/types/types";
import brandLogo from "@/assets/invoice-logo.png";

function formatInvoiceUSD(value: number | string | null | undefined) {
  return formatUSD(value, false);
}

function getClientNumber(client: ClientData, property: InvoiceProperty): string {
  return (
    client.clientNumber?.trim() ||
    client.CLIENTNumber?.trim() ||
    property.propertyDetails.clientNumber?.trim() ||
    "--"
  );
}

type InvoiceSheet2025Props = {
  client: ClientData;
  property: InvoiceProperty;
  yearInvoice: Invoice | undefined;
  selectedYear: number;
  invoiceDate: string;
  dueDate: string;
};

const InvoiceSheet2025 = React.forwardRef<HTMLDivElement, InvoiceSheet2025Props>(
  ({ client, property, yearInvoice, selectedYear, invoiceDate, dueDate }, ref) => (
    <div
      ref={ref}
      data-invoice-pdf-sheet
      id="invoice-2025-sheet"
      className="mx-auto w-full max-w-[950px] min-h-[255mm] bg-white shadow p-5 text-[12px] leading-[1.2] text-black font-sans"
    >
      <div className="flex items-start gap-2 pb-2">
        <img src={brandLogo} alt="LSP Tax logo" className="h-[76px] w-[76px] object-contain" />
        <div className="pt-1 text-[13px] leading-[1.25] font-semibold">
          <p className="text-[17px] font-black tracking-wide leading-[1.1]">LONE STAR PROPERTY TAX</p>
          <p>16107 KENSINGTON DRIVE, STE. 194</p>
          <p>SUGARLAND, TX 77479</p>
          <p>info@lsptax.com</p>
          <p>832-847-3911</p>
        </div>
      </div>

      <div className="my-3 border border-black p-2">
        <div className="grid grid-cols-[1fr_360px] gap-3 items-start text-[13px] leading-[1.25] font-medium">
          <div>
            <p>{client.clientName}</p>
            <p>{client.mailingAddress}</p>
            <p>{client.mailingAddressCityTxZip}</p>
          </div>
          <div className="grid grid-cols-[150px_1fr] gap-y-1">
            <p>Invoice Date:</p>
            <p>{invoiceDate}</p>
            <p>Invoice Number:</p>
            <p>{yearInvoice?.id ?? "--"}</p>
          </div>
        </div>
      </div>

      <div className="my-3 text-center text-[16px] font-bold underline tracking-wide">
        FOR PROFESSIONAL SERVICES
      </div>

      <div className="border border-black p-3">
        <div className="grid grid-cols-2 text-[13px] leading-[1.25] font-medium">
          <div className="min-h-[62px]">
            <p className="font-semibold">Property Tax Representation For:</p>
            <p>{property.propertyDetails.nameOnCad || "--"}</p>
            <p>{property.propertyDetails.propertyAddress || "--"}</p>
          </div>
          <div className="min-h-[62px] grid grid-cols-[150px_1fr]">
            <p>Client Number:</p>
            <p>{getClientNumber(client, property)}</p>
            <p>Account Number:</p>
            <p>{property.propertyDetails.accountNumber || "--"}</p>
            <p>Service:</p>
            <p>{selectedYear} Protest</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 text-[13px] leading-[1.25] font-medium">
          <div className="min-h-[88px]">
            <p>Begining Appraised Value: {formatInvoiceUSD(yearInvoice?.noticeAppraisedValue)}</p>
            <p>Ending Appraised Value: {formatInvoiceUSD(yearInvoice?.finalAppraisedValue)}</p>
            <p>Reduction: {formatInvoiceUSD(yearInvoice?.appraisedReduction)}</p>
            <p>Overall Tax Rate: {yearInvoice?.taxRate ?? 0}%</p>
          </div>
          <div className="min-h-[88px]">
            <p>Begining Market Value: {formatInvoiceUSD(yearInvoice?.noticeMarketValue)}</p>
            <p>Ending Market Value: {formatInvoiceUSD(yearInvoice?.finalMarketValue)}</p>
            <p>Reduction: {formatInvoiceUSD(yearInvoice?.marketReduction)}</p>
          </div>
        </div>

        <div className="mt-4 w-[300px] border border-black p-2 text-[13px] leading-[1.2] font-semibold">
          <div className="grid grid-cols-[1fr_1fr]">
            <p>Client Tax Savings:</p>
            <p>{formatInvoiceUSD(yearInvoice?.taxableSavings)}</p>
            <p>Contingency Fee:</p>
            <p>
              {yearInvoice?.contingencyFee ??
                yearInvoice?.contingencyFeePercent ??
                client.contingencyFee ??
                0}
              %
            </p>
            {(() => {
              const bppAmount = getBppInvoiceAmount(yearInvoice);
              if (bppAmount <= 0) return null;
              return (
                <>
                  <p>BPP:</p>
                  <p>{formatUSD(bppAmount)}</p>
                </>
              );
            })()}
            {(() => {
              const flatFeeAmount = getFlatFeeAmount(yearInvoice);
              if (flatFeeAmount <= 0) return null;
              return (
                <>
                  <p>Flat Fee:</p>
                  <p>{formatUSD(flatFeeAmount)}</p>
                </>
              );
            })()}
            <p>Due:</p>
            <p>{formatUSD(yearInvoice?.invoiceAmount)}</p>
          </div>
        </div>
      </div>

      <div className="my-4 border-t border-dashed border-black pt-1 text-center text-[15px] font-bold leading-none">
        Cut Here ✂
      </div>

      <div className="grid grid-cols-[1fr_340px] gap-4 min-h-[110px] text-[13px] leading-[1.25] font-medium">
        <div className="pl-1 pt-1">
          <p>{client.clientName}</p>
          <p>{client.mailingAddress}</p>
          <p>{client.mailingAddressCityTxZip}</p>
        </div>
        <div className="border border-black p-2">
          <div className="grid grid-cols-[140px_1fr] font-semibold">
            <p>Invoice Number:</p>
            <p>{yearInvoice?.id ?? "--"}</p>
            <p>Total Fee Due:</p>
            <p>{formatUSD(yearInvoice?.invoiceAmount)}</p>
            <p>Invoice Date:</p>
            <p>{invoiceDate}</p>
            <p>Due Date:</p>
            <p>{dueDate}</p>
          </div>
          <div className="mt-5 grid grid-cols-[140px_1fr] font-semibold">
            <p>Amount Enclosed:</p>
            <p className="border-b border-black" />
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-[1fr_1fr] text-[13px] leading-[1.25] font-semibold">
        <div>
          <p>Please remit payment to adress below:</p>
          <p className="mt-1">LONE STAR PROPERTY TAX</p>
          <p>16107 KENSINGTON DRIVE, STE. 194</p>
          <p>SUGARLAND, TX 77479</p>
        </div>
        <div>
          <p>OR&nbsp;&nbsp; ZELLE: (Include Invoice number)</p>
          <p>713-505-6806 (Lone Star Property Tax)</p>
        </div>
      </div>

      {yearInvoice?.paymentNotes?.trim() && (
        <div className="mt-4 text-[13px] leading-[1.25] font-medium">
          <p className="font-semibold">Payment Notes:</p>
          <p className="whitespace-pre-wrap">{yearInvoice.paymentNotes.trim()}</p>
        </div>
      )}
    </div>
  )
);

InvoiceSheet2025.displayName = "InvoiceSheet2025";

export default InvoiceSheet2025;

export { addInvoiceDays, formatInvoiceDate } from "@/utils/invoiceDates";

export function toSafeFilenamePart(value: string): string {
  return value
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .replace(/_+/g, "_");
}

export function getYearInvoice(property: InvoiceProperty, year: number) {
  return property.invoice.find((inv) => inv.year === year);
}
