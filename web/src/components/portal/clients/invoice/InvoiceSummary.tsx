import React from "react";
import { InvoiceData, InvoiceProperty, Invoice } from "@/types/types";
import { useReactToPrint } from "react-to-print";
import { useRef } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

const InvoiceSummary: React.FC<{
  invoice?: InvoiceData;
  selectedYear: number;
  setSelectedYear: (year: number) => void;
}> = ({ invoice, selectedYear, setSelectedYear }) => {
  const getYearlyInvoiceData = (property: InvoiceProperty) => {
    return property.invoice.find((inv: Invoice) => inv.year === selectedYear);
  };

  const calculateFees = () => {
    if (!invoice) return 0;
    return invoice.properties.reduce((total, property) => {
      const yearlyInvoice = getYearlyInvoiceData(property);
      const fee = yearlyInvoice?.invoiceAmount;
      // Handle both string and number types for backward compatibility
      const numericFee = typeof fee === 'string' ? parseFloat(fee) || 0 : (fee || 0);
      return total + numericFee;
    }, 0);
  };

  const totalFees = calculateFees();
  const contentRef = useRef<HTMLDivElement>(null);
  const reactToPrintFn = useReactToPrint({ contentRef });

  // Get unique years from all properties
  const getAvailableYears = () => {
    if (!invoice?.properties) return [];
    const years = new Set<number>();
    invoice.properties.forEach((property) => {
      property.invoice.forEach((inv: Invoice) => {
        years.add(inv.year);
      });
    });
    return Array.from(years).sort((a, b) => b - a); // Sort descending
  };

  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-gray-100">
      <div className="text-center space-x-4 flex justify-center align-center items-center">
        <Select
          onValueChange={(value) => setSelectedYear(Number(value))}
          value={selectedYear.toString()}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select Year" />
          </SelectTrigger>
          <SelectContent>
            {getAvailableYears().map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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
        ref={contentRef}
        className="bg-white w-[210mm] min-h-screen overflow-auto shadow-lg p-4 sm:p-6 md:p-8"
      >
        {/* Header Section */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold">LONE STAR PROPERTY TAX</h2>
            <p className="text-sm">16107 KENSINGTON DRIVE, STE. 194</p>
            <p className="text-sm">SUGARLAND, TX 77479</p>
            <p className="text-sm">info@lsptax.com</p>
            <p className="text-sm">832-847-3911</p>
          </div>
          <div>
            <p className="font-bold">
              Invoice Date: {new Date().toLocaleDateString()}
            </p>
            <p className="font-bold">
              Invoice Number: INV-{invoice?.client.clientNumber}-{selectedYear}
            </p>
          </div>
        </div>

        {/* Client Info */}
        <div className="flex flex-col border-2 border-black p-1 mb-4">
          <p className="font-bold">{invoice?.client?.clientName}</p>
          <p>{invoice?.client?.mailingAddress}</p>
          <p>{invoice?.client?.mailingAddressCityTxZip}</p>
        </div>

        <div className="text-center font-bold mb-4 underline">
          FOR PROFESSIONAL SERVICES - {selectedYear}
        </div>

        {/* Table */}
        <div className="overflow-x-auto mb-6">
          <table className="min-w-full border-collapse border-2 border-black">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-4 py-2 text-left">
                  Address
                </th>
                <th className="border border-gray-300 px-4 py-2 text-left">
                  Account Number
                </th>
                <th className="border border-gray-300 px-4 py-2 text-left">
                  Service
                </th>
                <th className="border border-gray-300 px-4 py-2 text-right">
                  Fee
                </th>
              </tr>
            </thead>
            <tbody>
              {invoice?.properties?.map((property) => {
                const yearlyInvoice = getYearlyInvoiceData(property);
                return (
                  <tr key={property.propertyDetails.id}>
                    <td className="border border-gray-300 px-4 py-2">
                      {property.propertyDetails.mailingAddress}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {property.propertyDetails.accountNumber}
                    </td>
                    <td className="border border-gray-300 px-4 py-2">
                      {selectedYear} Protest
                    </td>
                    <td className="border border-gray-300 px-4 py-2 text-right">
                      ${(typeof yearlyInvoice?.invoiceAmount === 'string' ? parseFloat(yearlyInvoice.invoiceAmount) || 0 : yearlyInvoice?.invoiceAmount || 0).toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td
                  colSpan={3}
                  className="border border-gray-300 px-4 py-2 text-right font-bold"
                >
                  Total
                </td>
                <td className="border border-gray-300 px-4 py-2 text-right">
                  ${totalFees.toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Payment Section */}
        <div className="mt-8">
          <p className="font-bold mb-4">Please remit payment to:</p>
          <div className="flex justify-between">
            <div>
              <p>LONE STAR PROPERTY TAX</p>
              <p>16107 KENSINGTON DRIVE, STE. 194</p>
              <p>SUGARLAND, TX 77479</p>
            </div>
            <div className="text-left border-2 border-black p-4 bg-gray-200">
              <p>
                Amount Enclosed: <span className="underline">${totalFees.toFixed(2)}</span>
              </p>
              <p>OR</p>
              <p>ZELLE: 713-505-6806</p>
              <p>(Lone Star Property Tax)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceSummary;
