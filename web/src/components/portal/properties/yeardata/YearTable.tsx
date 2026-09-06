import React from "react";
import { formatUSD } from "@/utils/formatCurrency";
import { getBppInvoiceAmount } from "@/utils/bppInvoice";
import { Invoice } from "@/types/types";
import { PROPERTY_INVOICE_YEARS } from "../propertyInvoiceYears";

// Define the type for table row data
type TableRow = {
  year: number;
  "Protest Date"?: string;
  "BPP Rendered"?: string;
  "BPP Invoice": string | number;
  "BPP Paid": string;
  "Notice Land Value": string | number;
  "Notice Improvement Value": string | number;
  "Notice Market Value": string | number;
  "Notice Appraised Value": string | number;
  "Final Land Value": string | number;
  "Final Improvement Value": string | number;
  "Final Market Value": string | number;
  "Final Appraised Value": string | number;
  "Market Reduction": string | number;
  "Appraised Reduction": string | number;
  "Hearing Date"?: string;
  "Generated Date"?: string;
  "Due Date"?: string;
  "Invoice Date"?: string;
  "Under Litigation": boolean;
  "Under Arbitration": boolean;
  "Tax Rate": string | number;
  "Taxable Savings": string | number;
  "Contingency Fee": string | number;
  "Invoice Amount": string | number;
  "Paid Date": string;
  "Payment Notes": string;
  "Beginning Market": string | number;
  "Ending Market": string | number;
  "Beginning Appraised": string | number;
  "Ending Appraised": string | number;
};

const YearTable: React.FC<{ invoices: Invoice[]; showBpp?: boolean }> = ({
  invoices,
  showBpp = true,
}) => {
  // Extract data for the table: creating rows and columns
  const years = PROPERTY_INVOICE_YEARS;
  const rowData: TableRow[] = years.map((year) => {
    const yearData = invoices.find((invoice) => invoice.year === year);

    return {
      year,
      "Protest Date": yearData?.protestDate,
      "BPP Rendered": yearData?.bppRendered,
      "BPP Invoice": yearData ? getBppInvoiceAmount(yearData) : "-",
      "BPP Paid": yearData?.bppPaid || "-",
      "Notice Land Value": yearData?.noticeLandValue || "-",
      "Notice Improvement Value": yearData?.noticeImprovementValue || "-",
      "Notice Market Value": yearData?.noticeMarketValue || "-",
      "Notice Appraised Value": yearData?.noticeAppraisedValue || "-",
      "Final Land Value": yearData?.finalLandValue || "-",
      "Final Improvement Value": yearData?.finalImprovementValue || "-",
      "Final Market Value": yearData?.finalMarketValue || "-",
      "Final Appraised Value": yearData?.finalAppraisedValue || "-",
      "Market Reduction": yearData?.marketReduction || "-",
      "Appraised Reduction": yearData?.appraisedReduction || "-",
      "Hearing Date": yearData?.hearingDate || "-",
      "Generated Date": yearData?.generatedDate || "-",
      "Due Date": yearData?.dueDate || "-",
      "Invoice Date": yearData?.invoiceDate || "-",
      "Under Litigation": yearData?.underLitigation || false,
      "Under Arbitration": yearData?.underArbitration || false,
      "Tax Rate": yearData?.taxRate || "-",
      "Taxable Savings": yearData?.taxableSavings || "-",
      "Contingency Fee": yearData?.contingencyFee || "N/A",
      "Invoice Amount": yearData?.invoiceAmount || "N/A", 
      "Paid Date": yearData?.paidDate || "-",
      "Payment Notes": yearData?.paymentNotes || "-",
      "Beginning Market": yearData?.beginningMarket || "-",
      "Ending Market": yearData?.endingMarket || "-",
      "Beginning Appraised": yearData?.beginningAppraised || "-",
      "Ending Appraised": yearData?.endingAppraised || "-",
    };
  });

  return (
    <div className="container mx-auto p-6">
      <h2 className="text-2xl font-semibold mb-4 text-gray-800">
        Yearly Invoices Summary
      </h2>
      <div className="overflow-x-auto rounded-lg shadow-md">
        <table className="min-w-full text-left border-collapse bg-white rounded-lg">
          <thead>
            <tr className="bg-gradient-to-r from-indigo-500 to-blue-500 text-white">
              <th className="px-6 py-3 text-sm font-medium uppercase"></th>
              {years.map((year) => (
                <th
                  key={year}
                  className="px-6 py-3 text-sm font-medium uppercase"
                >
                  {year}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.keys(rowData[0])
              .filter((key) => {
                const isBppField = ["BPP Rendered", "BPP Invoice", "BPP Paid"].includes(key);
                if (isBppField && !showBpp) return false;

                const isConditionalField = [
                  "Beginning Market",
                  "Ending Market",
                  "Beginning Appraised",
                  "Ending Appraised",
                ].includes(key);

                if (!isConditionalField) return true; // Show all normal fields

                return rowData.some(
                  (data) =>
                    data["Under Litigation"] || data["Under Arbitration"]
                ); // Show conditional fields only if any row has litigation/arbitration
              })
              .map((key, idx) => {
                if (key === "year") return null;
                return (
                  <tr
                    key={idx}
                    className={`hover:bg-gray-100 ${
                      idx % 2 === 0 ? "bg-gray-50" : "bg-white"
                    }`}
                  >
                    <td className="px-6 py-3 text-sm font-medium text-gray-800">
                      {key}
                    </td>
                    {rowData.map((data) => (
                      <td
                        key={data.year}
                        className="px-6 py-3 text-sm text-gray-700"
                      >
                        {typeof data[key as keyof TableRow] === "boolean"
                          ? data[key as keyof TableRow]
                            ? "Yes"
                            : "No"
                          : (() => {
                              const value = data[key as keyof TableRow];
                              // Format currency fields
                              const currencyFields = [
                                "Notice Land Value", "Notice Improvement Value", "Notice Market Value", "Notice Appraised Value",
                                "Final Land Value", "Final Improvement Value", "Final Market Value", "Final Appraised Value",
                                "Market Reduction", "Appraised Reduction", "Taxable Savings", "BPP Invoice", "Invoice Amount",
                                "Beginning Market", "Ending Market", "Beginning Appraised", "Ending Appraised"
                              ];
                              
                              if (key === "BPP Invoice") {
                                const amount = typeof value === "number" ? value : 0;
                                return amount > 0 ? formatUSD(amount) : "-";
                              }
                              
                              if (currencyFields.includes(key) && value !== "-" && value !== "N/A") {
                                return formatUSD(String(value));
                              }
                              
                              return value;
                            })()}
                      </td>
                    ))}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default YearTable;
