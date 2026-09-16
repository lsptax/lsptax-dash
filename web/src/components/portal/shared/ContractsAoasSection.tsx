import { FileText, LoaderCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SendEnvelopeDialog } from "./SendEnvelopeDialog";
import type { ContractListItem } from "@/api/api";
import type { Property } from "@/types/types";

type ContractsAoasSectionProps = {
  entityId: number;
  entityLabel: "client" | "prospect";
  entityName: string;
  email?: string;
  properties: Property[];
  contracts: ContractListItem[];
  loading: boolean;
  downloadingId: number | null;
  emptyMessage?: string;
  onRefresh: () => void;
  onDownloadSigned: (contractId: number) => void;
};

export function ContractsAoasSection({
  entityId,
  entityLabel,
  entityName,
  email,
  properties,
  contracts,
  loading,
  downloadingId,
  emptyMessage = "No contracts or AOAs yet.",
  onRefresh,
  onDownloadSigned,
}: ContractsAoasSectionProps) {
  return (
    <div className="mt-8">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold">Contracts & AOAs</h2>
        <div className="flex items-center gap-2">
          <SendEnvelopeDialog
            kind="aoas"
            entityId={entityId}
            entityLabel={entityLabel}
            entityName={entityName}
            email={email}
            properties={properties}
            onSent={onRefresh}
          />
          <Button variant="outline" size="sm" disabled={loading} onClick={onRefresh}>
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : "Refresh status"}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-4">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          Loading contracts...
        </div>
      ) : contracts.length === 0 ? (
        <p className="text-muted-foreground">{emptyMessage}</p>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-3 font-medium">Type</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Property</th>
                <th className="text-left p-3 font-medium">Signed at</th>
                <th className="text-left p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => (
                <tr key={c.id} className="border-t">
                  <td className="p-3">{c.type === "AOA" ? "AOA" : "Client contract"}</td>
                  <td className="p-3">
                    <Badge
                      variant={
                        c.status === "COMPLETED"
                          ? "default"
                          : c.status === "DECLINED" || c.status === "VOIDED"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {c.status}
                    </Badge>
                  </td>
                  <td className="p-3">{c.property?.accountNumber ?? "—"}</td>
                  <td className="p-3">
                    {c.signedAt ? new Date(c.signedAt).toLocaleDateString() : "—"}
                  </td>
                  <td className="p-3">
                    {c.status === "COMPLETED" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={downloadingId === c.id}
                        onClick={() => onDownloadSigned(c.id)}
                      >
                        {downloadingId === c.id ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                          <FileText className="h-4 w-4 mr-1" />
                        )}
                        Download signed
                      </Button>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
