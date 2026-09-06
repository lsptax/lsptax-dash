import { useSearchParams } from "react-router-dom";
import { getInvoice, getInvoiceByPropertyId } from "@/store/data";
import { InvoiceData } from "@/types/types";
import { useState, useEffect, useMemo } from "react";
import InvoiceDetails2025 from "./InvoiceDetails2025";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { routes } from "@/routes/ROUTES";
import { normalizeInvoiceData } from "@/utils/invoiceDataNormalization";
import { BackToListLink } from "../../BackToListLink";

const InvoicePage = () => {
  const [searchParams] = useSearchParams();
  const propertyId = searchParams.get("propertyId");
  const clientId = searchParams.get("clientId");
  const [invoiceData, setInvoiceData] = useState<InvoiceData | undefined>();
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableYears = useMemo(
    () =>
      Array.from(
        new Set(
          (invoiceData?.properties ?? [])
            .flatMap((property) => property.invoice)
            .map((invoice) => invoice.year)
        )
      ).sort((a, b) => b - a),
    [invoiceData]
  );

  useEffect(() => {
    if (availableYears.length === 0) return;
    setSelectedYear(availableYears[0]);
  }, [invoiceData, availableYears]);

  useEffect(() => {
    if (!propertyId && !clientId) {
      setInvoiceData(undefined);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const fetchInvoiceData = async () => {
      try {
        const response = propertyId
          ? await getInvoiceByPropertyId({ propertyId })
          : await getInvoice({ clientId: clientId as string });
        const { invoiceData: normalized, debug } = normalizeInvoiceData(response);
        if (import.meta.env.DEV) {
          const debugIdentifier = propertyId
            ? `propertyId=${propertyId}`
            : `clientId=${clientId}`;
          console.group(`[InvoicePage] invoice payload debug for ${debugIdentifier}`);
          console.log("Raw response:", response);
          console.log("Normalization debug:", debug);
          console.log("Normalized invoice data:", normalized);
          console.groupEnd();
        }
        if (!cancelled) {
          setInvoiceData(normalized);
        }
      } catch (e) {
        console.error("Error fetching invoice data:", e);
        if (!cancelled) {
          setInvoiceData(undefined);
          setError("Failed to load invoice data. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void fetchInvoiceData();
    return () => {
      cancelled = true;
    };
  }, [clientId, propertyId]);

  if (!propertyId && !clientId) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 min-h-[40vh] px-4 text-center">
        <p className="text-lg font-semibold text-red-600">Property ID is required</p>
        <p className="text-muted-foreground max-w-md">
          Open invoices from a property so the URL includes{" "}
          <code className="text-sm bg-muted px-1 rounded">?propertyId=…</code>.
        </p>
        <BackToListLink fallback={routes.invoices.list()} label="Back to invoices" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-lg font-semibold text-gray-700">Loading data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 gap-4 px-4">
        <p className="text-lg font-semibold text-red-700">{error}</p>
        <BackToListLink fallback={routes.invoices.list()} label="Back to invoices" />
      </div>
    );
  }

  if (!invoiceData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 gap-4 px-4">
        <p className="text-lg font-semibold text-gray-700">No invoice data for this client.</p>
        <BackToListLink fallback={routes.invoices.list()} label="Back to invoices" />
      </div>
    );
  }

  if (!invoiceData.client || !Array.isArray(invoiceData.properties)) {
    console.error("Invalid invoice data structure:", invoiceData);
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="flex flex-col items-center space-y-4">
          <p className="text-lg font-semibold text-red-700">Error: Invalid data structure</p>
          <p className="text-sm text-gray-600">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mx-auto max-w-[1100px] px-3 pt-4">
        <BackToListLink
          fallback={routes.invoices.list()}
          label="Back to invoices"
          className="mb-3"
        />
        {availableYears.length > 0 && (
          <div className="mb-3 w-[180px]">
            <Select
              onValueChange={(value) => setSelectedYear(Number(value))}
              value={selectedYear.toString()}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Year" />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      <InvoiceDetails2025
        invoice={invoiceData}
        selectedYear={selectedYear}
        propertyIdFilter={propertyId}
      />
    </div>
  );
};

export default InvoicePage;
