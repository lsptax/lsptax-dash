import React from "react";
import { InvoiceData, InvoiceProperty, Invoice } from "@/types/types";
import { useReactToPrint } from "react-to-print";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { formatUSD } from "@/utils/formatCurrency";

const InvoiceDetails: React.FC<{
  invoice?: InvoiceData;
  selectedYear: number;
}> = ({ invoice, selectedYear }) => {
  const getYearlyInvoiceData = (property: InvoiceProperty) => {
    return property.invoice.find((inv: Invoice) => inv.year === selectedYear);
  };

  const calculateFees = () => {
    if (!invoice) return 0;
    return invoice.properties.reduce((total, property) => {
      const yearlyInvoice = getYearlyInvoiceData(property);
      return total + (yearlyInvoice?.invoiceAmount ?? 0);
    }, 0);
  };
  const totalFees = calculateFees();
  const contentRef = useRef<HTMLDivElement>(null);
  const reactToPrintFn = useReactToPrint({
    contentRef,
    pageStyle: `
    @page {
      size: A4 landscape;
      margin: 10mm;
    }
    @media print {
      body { zoom: 1; }
      #pdf-content {
        width: 100%;
        max-width: 420mm;
        height: auto !important;
        overflow: visible !important;
      }
      table {
        page-break-inside: auto;
        width: 100%;
        max-width: 100%;
        table-layout: fixed;
        border-collapse: collapse;
      }
      tr {
        page-break-inside: avoid;
        page-break-after: auto;
      }
      th, td {
        font-size: 8px;
        word-wrap: break-word;
        overflow-wrap: break-word;
        white-space: normal;
      }
      th:nth-last-child(-n+4),
      td:nth-last-child(-n+4) {
        min-width: 50px;
        max-width: 70px;
      }
          @media print {
      th, td {
        font-size: 8px;
        padding: 1px !important;
        word-wrap: break-word;
        overflow-wrap: break-word;
        white-space: normal;
      }
    }
    }
  `,
  });

  return (
    <>
      <div className="text-center">
        <Button
          variant={"blue"}
          className="bg-brand-blue rounded-md p-2 px-6 ml-4 text-white"
          onClick={() => reactToPrintFn()}
        >
          <Printer />
          Print
        </Button>
      </div>

      <div
        className="flex justify-center items-center min-h-screen bg-gray-100"
        style={{ overflow: "hidden" }}
      >
        <div
          ref={contentRef}
          id="pdf-content"
          className="bg-white min-w-screen h-[210mm] overflow-auto shadow-lg sm:p-6 md:p-8"
        >
          <div className="flex justify-between items-start mb-4 border-4 border-black">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold">LONE STAR PROPERTY TAX</h2>
                <p className="text-sm">16107 KENSINGTON DRIVE, STE. 194</p>
                <p className="text-sm">SUGARLAND, TX 77479</p>
                <p className="text-sm">info@lsptax.com</p>
                <p className="text-sm">832-847-3911</p>
              </div>
            </div>
            <div>
              <div>
                <p>{invoice?.client?.clientName}</p>
                <p>{invoice?.client?.mailingAddress}</p>
                <p>{invoice?.client?.mailingAddressCityTxZip}</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto mb-6">
            <table className="min-w-full border-collapse border-2 border-black">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-300 px-4 py-2 text-left">
                    Type of Account
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-left">
                    Property Address
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-left">
                    County
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-left">
                    Account Number
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-left">
                    Invoice Type
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-left">
                    Notice Market value
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-left">
                    Final Market value
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-left">
                    Market Value Reduction
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-left">
                    Notice Appraised Value
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-left">
                    Final Appraised Value
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-left">
                    Appraised Value Reduction
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-left">
                    Overall Tax Rate
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-left">
                    Tax Savings
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-left">
                    Contingency (%)
                  </th>
                  <th className="border border-gray-300 px-4 py-2 text-left">
                    Contingency Fee Due:
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoice?.properties.map((property) => {
                  const yearlyInvoice = getYearlyInvoiceData(property);
                  return (
                    <tr key={property.propertyDetails.id}>
                      <td className="border border-gray-300 px-4 py-2">
                        {invoice.client.typeOfAcct}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {property.propertyDetails.cadMailingAddress}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {property.propertyDetails.cadCounty}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {property.propertyDetails.accountNumber}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {selectedYear} Protest
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {formatUSD(yearlyInvoice?.noticeMarketValue)}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {formatUSD(yearlyInvoice?.finalMarketValue)}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {formatUSD(yearlyInvoice?.marketReduction)}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {formatUSD(yearlyInvoice?.noticeAppraisedValue)}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {formatUSD(yearlyInvoice?.finalAppraisedValue)}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {formatUSD(yearlyInvoice?.appraisedReduction)}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {yearlyInvoice?.taxRate}%
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {formatUSD(yearlyInvoice?.taxableSavings)}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {(() => {
                          const contingencyFee = invoice.client.contingencyFee || "0";
                          return `${contingencyFee}%`;
                        })()}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        {(() => {
                          const contingencyFee =
                            yearlyInvoice?.contingencyFee ??
                            yearlyInvoice?.contingencyFeePercent ??
                            invoice.client.contingencyFee ??
                            "0";
                          const contingencyPercentage = Number(contingencyFee);
                          const taxableSavings = yearlyInvoice?.taxableSavings || 0;
                          const calculatedFee = taxableSavings * (contingencyPercentage / 100);
                          return formatUSD(calculatedFee);
                        })()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td
                    colSpan={14}
                    className="border border-gray-300 px-4 py-2 text-right font-bold"
                  >
                    Total
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    {formatUSD(totalFees)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};

export default InvoiceDetails;
