import { Button } from "@/components/ui/button";
import { Download, Send, LoaderCircle } from "lucide-react";
import { ClientData, Property } from "@/types/types";
import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { getSingleClient } from "@/store/data";
import { previewAoa, sendAoaForClient } from "@/api/api";
import { useToast } from "@/hooks/use-toast";
import { routes } from "@/routes/ROUTES";

interface Client {
  client: ClientData;
  properties: Property[];
}

const AppointmentForm: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const clientIdParam = searchParams.get("clientId");
  const propertyIdParam = searchParams.get("propertyId");
  const [clientData, setClientData] = useState<Client | null>(null);
  const [aoaPdfBase64, setAoaPdfBase64] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  // Fetch client (and properties) when clientId is in URL
  useEffect(() => {
    const fetchClientData = async () => {
      try {
        if (clientIdParam) {
          const response = await getSingleClient({ clientId: clientIdParam });
          setClientData(response ?? null);
        } else {
          setClientData(null);
        }
      } catch (error) {
        console.error("Error fetching client data:", error);
        setClientData(null);
      }
    };
    fetchClientData();
  }, [clientIdParam]);

  // Resolve which property to use: URL param > first property
  const effectivePropertyId =
    propertyIdParam != null && propertyIdParam !== ""
      ? Number(propertyIdParam)
      : clientData?.properties?.[0]?.id;
  const clientIdNum = clientData?.client?.id != null ? Number(clientData.client.id) : null;

  // Fetch AOA PDF from backend when we have both client and property
  useEffect(() => {
    if (clientIdNum == null || effectivePropertyId == null || Number.isNaN(effectivePropertyId)) {
      setAoaPdfBase64(null);
      setPdfError(null);
      return;
    }
    setLoadingPdf(true);
    setPdfError(null);
    previewAoa(clientIdNum, effectivePropertyId)
      .then((res) => setAoaPdfBase64(res.aoaPdf ?? null))
      .catch((err) => {
        setPdfError(err instanceof Error ? err.message : "Failed to load AOA preview");
        setAoaPdfBase64(null);
      })
      .finally(() => setLoadingPdf(false));
  }, [clientIdNum, effectivePropertyId]);

  const hasPdf = !!aoaPdfBase64 && !loadingPdf;

  const handleDownload = () => {
    if (!aoaPdfBase64) return;
    try {
      const blob = new Blob(
        [Uint8Array.from(atob(aoaPdfBase64), (c) => c.charCodeAt(0))],
        { type: "application/pdf" }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `appointment-of-agent-${clientData?.client?.clientNumber ?? clientIdParam ?? "aoa"}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Download started", description: "AOA PDF has been downloaded." });
    } catch {
      toast({
        title: "Download failed",
        description: "Could not save the PDF.",
        variant: "destructive",
      });
    }
  };

  const handleSendForSigning = async () => {
    if (clientIdNum == null || effectivePropertyId == null || Number.isNaN(effectivePropertyId)) {
      toast({
        title: "Error",
        description: "Client and property are required to send AOA.",
        variant: "destructive",
      });
      return;
    }
    setIsSending(true);
    try {
      await sendAoaForClient(clientIdNum, effectivePropertyId);
      toast({
        title: "AOA sent for signing",
        description: "The client will receive an email from DocuSign to sign the Appointment of Agent.",
      });
      navigate(
        routes.client.detail(clientData?.client?.id ?? clientIdParam ?? "")
      );
    } catch (error) {
      toast({
        title: "Failed to send AOA",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  if (!clientIdParam) {
    return (
      <div className="p-4 max-w-2xl mx-auto rounded-lg border border-gray-200 bg-gray-50 text-gray-600">
        <p className="font-medium">No client selected</p>
        <p className="text-sm mt-1">
          Open this page from a client (e.g. Client details → Agent / AOA) with <code>?clientId=...</code> to load the
          Appointment of Agent (Form 50-162) PDF from the server.
        </p>
      </div>
    );
  }

  if (!clientData) {
    return (
      <div className="flex items-center justify-center py-12 gap-2 text-gray-600">
        <LoaderCircle className="h-6 w-6 animate-spin" />
        Loading client data...
      </div>
    );
  }

  const hasMultipleProperties = (clientData.properties?.length ?? 0) > 1;
  const noProperties = !clientData.properties?.length;

  if (noProperties) {
    return (
      <div className="p-4 max-w-2xl mx-auto rounded-lg border border-amber-200 bg-amber-50 text-amber-800">
        <p className="font-medium">No properties for this client</p>
        <p className="text-sm mt-1">
          Add at least one property for client {clientData.client.clientName} before generating the Appointment of
          Agent (Form 50-162).
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex flex-wrap gap-2 mb-4">
        <Button
          variant="default"
          className="rounded-md p-2 px-6 bg-brand-blue hover:bg-brand-blue-hover"
          onClick={handleDownload}
          disabled={!hasPdf}
        >
          <Download className="mr-2 h-4 w-4" />
          Download PDF
        </Button>
        <Button
          variant="default"
          className="rounded-md p-2 px-6 bg-brand-blue hover:bg-brand-blue-hover"
          onClick={handleSendForSigning}
          disabled={isSending || !hasPdf}
        >
          {isSending ? (
            <span className="flex items-center gap-2">
              <LoaderCircle className="animate-spin h-5 w-5" />
              Sending...
            </span>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Send for signing
            </>
          )}
        </Button>
      </div>

      {hasMultipleProperties && !propertyIdParam && (
        <p className="text-sm text-gray-600 mb-2">
          Using first property. To use another, open this page with <code>?clientId=...&propertyId=...</code> or go to
          the property page and use &quot;Preview AOA&quot; there.
        </p>
      )}

      {loadingPdf && (
        <div className="flex items-center justify-center py-12 gap-2 text-gray-600">
          <LoaderCircle className="h-6 w-6 animate-spin" />
          Loading Appointment of Agent (50-162) from server...
        </div>
      )}

      {pdfError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800 mb-4">
          <p className="font-medium">Preview could not be loaded</p>
          <p className="text-sm mt-1">{pdfError}</p>
        </div>
      )}

      {hasPdf && (
        <div className="rounded-lg border bg-white overflow-hidden">
          <p className="text-sm font-medium text-gray-700 p-2 border-b bg-gray-50">
            Appointment of Agent for Property Tax Matters (Form 50-162) — generated by server
          </p>
          <iframe
            title="Appointment of Agent (AOA) preview"
            src={`data:application/pdf;base64,${aoaPdfBase64}#toolbar=0&navpanes=0`}
            className="w-full h-[75vh] min-h-[500px]"
          />
        </div>
      )}
    </div>
  );
};

export default AppointmentForm;
