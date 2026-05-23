import { getPreviewDocuments, getSingleProspect } from "@/store/data";
import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { changeProspectStatus, sendContract } from "@/api/api";
import { useToast } from "@/hooks/use-toast";
import { Property, Prospect } from "@/types/types";
import { Button } from "@/components/ui/button";
import { LoaderCircle } from "lucide-react";
import { routes } from "@/routes/ROUTES";

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

interface ProspectData {
  prospect: Prospect;
  properties: Property[];
}

const PreviewSignedPdf = () => {
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const [aoaPdfData, setAoaPdfData] = useState<Uint8Array | null>(null);
  const [contractPdfData, setContractPdfData] = useState<Uint8Array | null>(
    null
  );
  const [clientData, setClientData] = useState<ProspectData | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const convertBase64ToUint8Array = (base64String: string): Uint8Array => {
    const base64WithoutPrefix = base64String.split(";base64,").pop() || "";
    const byteCharacters = atob(base64WithoutPrefix);
    return new Uint8Array(
      Array.from(byteCharacters, (char) => char.charCodeAt(0))
    );
  };

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError(null);
      setClientData(null);
      setAoaPdfData(null);
      setContractPdfData(null);
      return;
    }

    const prospectIdNum = Number(id);
    if (!Number.isFinite(prospectIdNum)) {
      setLoading(false);
      setError("Invalid prospect ID.");
      setClientData(null);
      setAoaPdfData(null);
      setContractPdfData(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const [previewRes, prospectRes] = await Promise.all([
          getPreviewDocuments({ prospectId: prospectIdNum }),
          getSingleProspect({ prospectId: id }),
        ]);
        if (cancelled) return;
        if (previewRes?.aoaPdf) {
          setAoaPdfData(convertBase64ToUint8Array(previewRes.aoaPdf));
        } else {
          setAoaPdfData(null);
        }
        if (previewRes?.contractPdf) {
          setContractPdfData(convertBase64ToUint8Array(previewRes.contractPdf));
        } else {
          setContractPdfData(null);
        }
        setClientData(prospectRes ?? null);
      } catch (e) {
        console.error("Error loading preview documents:", e);
        if (!cancelled) {
          setError("Failed to load preview documents.");
          setClientData(null);
          setAoaPdfData(null);
          setContractPdfData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  if (!id) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 min-h-[40vh] px-4 text-center">
        <p className="text-lg font-semibold text-red-600">Prospect ID is required</p>
        <p className="text-muted-foreground max-w-md">
          Open this page from a prospect so the URL includes{" "}
          <code className="text-sm bg-muted px-1 rounded">?id=…</code>.
        </p>
        <Button asChild variant="outline">
          <Link to={routes.prospects.list()}>Back to prospects</Link>
        </Button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 min-h-[40vh] px-4 text-center">
        <p className="text-lg font-semibold text-red-600">{error}</p>
        <Button asChild variant="outline">
          <Link to={routes.prospects.list()}>Back to prospects</Link>
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-gray-500 bg-transparent">
        <LoaderCircle className="w-8 h-8 animate-spin mb-4" />
        <p>Loading client data...</p>
      </div>
    );
  }

  if (!clientData) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 min-h-[40vh] px-4 text-center">
        <p className="text-lg font-semibold text-gray-700">No prospect data available.</p>
        <Button asChild variant="outline">
          <Link to={routes.prospects.list()}>Back to prospects</Link>
        </Button>
      </div>
    );
  }

  const handleSendContract = async (prospectId: number) => {
    setIsSending(true);
    try {
      await sendContract({ prospectId });
      toast({
        title: "Contract Sent Successfully",
        description: `Contract sent to ID: ${prospectId}`,
      });
      setClientData((prevData) =>
        prevData
          ? {
              ...prevData,
              prospect: { ...prevData.prospect, status: "IN_PROGRESS" },
            }
          : prevData
      );
      if (clientData?.prospect.status === "CONTACTED") {
        await changeProspectStatus({
          prospectId,
          newStatus: "IN_PROGRESS",
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Failed to send contract",
        description: "Please try again",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="p-4 bg-transparent">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Preview Contract PDFs</h1>
        <Button
          variant="blue"
          onClick={() => handleSendContract(clientData.prospect.id)}
        >
          {clientData.prospect.status === "IN_PROGRESS" ? (
            "Sent"
          ) : isSending ? (
            <span className="flex items-center gap-2">
              <LoaderCircle className="animate-spin w-5 h-5" /> Sending...
            </span>
          ) : (
            "Send Contract"
          )}
        </Button>
      </div>

      <div className="flex flex-col gap-4 bg-transparent">
        {[
          { title: "AOA Form", data: aoaPdfData },
          { title: "Contract Form", data: contractPdfData },
        ].map(({ title, data }, index) => (
          <div
            key={index}
            className="p-4 rounded-lg bg-transparent border border-gray-300"
          >
            <h2 className="text-lg font-semibold mb-2">{title}</h2>
            {data ? (
              <iframe
                title={title}
                src={`data:application/pdf;base64,${uint8ArrayToBase64(data)}#toolbar=0&navpanes=0`}
                className="w-full h-[75vh] min-h-[400px] rounded border bg-white"
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                <p>No {title} available.</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PreviewSignedPdf;
