import { useCallback, useEffect, useState } from "react";
import {
  getContractDownloadUrl,
  getContractsByClient,
  syncClientContractStatus,
  type ContractListItem,
} from "@/api/api";
import { useToast } from "@/hooks/use-toast";

export function useEntityContracts(entityId: number | undefined) {
  const { toast } = useToast();
  const [contracts, setContracts] = useState<ContractListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const refresh = useCallback(() => {
    if (!entityId) return;
    setLoading(true);
    syncClientContractStatus(entityId)
      .catch(() => {})
      .then(() => getContractsByClient(entityId))
      .then(setContracts)
      .catch(() => setContracts([]))
      .finally(() => setLoading(false));
  }, [entityId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [refresh]);

  const downloadSigned = async (contractId: number) => {
    setDownloadingId(contractId);
    try {
      const { url } = await getContractDownloadUrl(contractId);
      window.open(url, "_blank");
      toast({
        title: "Download started",
        description: "Signed document opened in a new tab.",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Download failed",
        description: "Could not download signed PDF.",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  return { contracts, loading, refresh, downloadingId, downloadSigned };
}
