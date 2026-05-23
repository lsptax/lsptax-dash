import { getInvoice } from "@/store/data";
import { InvoiceData } from "@/types/types";
import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import InvoiceSummary from "./InvoiceSummary";
import InvoiceDetails from "./InvoiceDetails";
import { Button } from "@/components/ui/button";
import { routes } from "@/routes/ROUTES";

const InvoicePage = () => {
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get("clientId");
  const [invoiceData, setInvoiceData] = useState<InvoiceData | undefined>();
  const [selectedYear, setSelectedYear] = useState<number>(2025);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) {
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
        const response = await getInvoice({ clientId });
        if (!cancelled) {
          setInvoiceData(response);
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
  }, [clientId]);

  if (!clientId) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 min-h-[40vh] px-4 text-center">
        <p className="text-lg font-semibold text-red-600">Client ID is required</p>
        <p className="text-muted-foreground max-w-md">
          Open invoices from a client so the URL includes{" "}
          <code className="text-sm bg-muted px-1 rounded">?clientId=…</code>.
        </p>
        <Button asChild variant="outline">
          <Link to={routes.clients.list()}>Back to clients</Link>
        </Button>
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
        <Button asChild variant="outline">
          <Link to={routes.clients.list()}>Back to clients</Link>
        </Button>
      </div>
    );
  }

  if (!invoiceData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 gap-4 px-4">
        <p className="text-lg font-semibold text-gray-700">No invoice data for this client.</p>
        <Button asChild variant="outline">
          <Link to={routes.clients.list()}>Back to clients</Link>
        </Button>
      </div>
    );
  }

  if (!invoiceData.client || !invoiceData.properties || !Array.isArray(invoiceData.properties)) {
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
      <InvoiceSummary
        invoice={invoiceData}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
      />
      <InvoiceDetails invoice={invoiceData} selectedYear={selectedYear} />
    </div>
  );
};

export default InvoicePage;
