import { useState } from "react";
import { NavLink } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { sendAoaForAllProperties, sendDocs } from "@/api/api";
import { useToast } from "@/hooks/use-toast";
import { propertyDisplayFields } from "@/utils/propertyDisplay";
import type { Property } from "@/types/types";

type SendEnvelopeKind = "docs" | "aoas";

type SendEnvelopeDialogProps = {
  kind: SendEnvelopeKind;
  entityId: number;
  entityLabel: "client" | "prospect";
  entityName: string;
  email?: string;
  properties: Property[];
  contractPreviewTo?: string;
  aoaPreviewTo?: (propertyId: number) => string;
  onSent?: () => void;
};

export function SendEnvelopeDialog({
  kind,
  entityId,
  entityLabel,
  entityName,
  email,
  properties,
  contractPreviewTo,
  aoaPreviewTo,
  onSent,
}: SendEnvelopeDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [agree, setAgree] = useState(false);
  const [sending, setSending] = useState(false);

  const isDocs = kind === "docs";

  const handleSend = async () => {
    if (!agree || sending) return;
    setSending(true);
    try {
      if (isDocs) {
        const res = await sendDocs(entityId, "all_docs");
        toast({
          title: "✓ Docs sent",
          description:
            "Contract + all AOAs have been sent in a single envelope." +
            ("envelopeId" in res && res.envelopeId ? ` Envelope: ${res.envelopeId}` : ""),
        });
      } else {
        const res = await sendAoaForAllProperties(entityId);
        toast({
          title: res.success ? "✓ AOA envelope sent" : "AOA envelope sent (with failures)",
          description:
            `Sent ${res.sent}/${res.total}. Failed ${res.failed}.` +
            (res.envelopeId ? ` Envelope: ${res.envelopeId}` : ""),
          variant: res.failed > 0 ? "destructive" : undefined,
        });
      }
      setOpen(false);
      setAgree(false);
      onSent?.();
    } catch (err) {
      toast({
        title: isDocs ? "Failed to send docs" : "Failed to send AOAs",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setAgree(false);
      }}
    >
      <AlertDialogTrigger asChild>
        <Button
          variant="blue"
          size="sm"
          disabled={properties.length === 0}
          onClick={() => setOpen(true)}
        >
          {isDocs ? "Send All Docs" : "Send AOA for all properties"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isDocs
              ? "Send all docs (single envelope)"
              : "Send AOA for all properties (single envelope)"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isDocs ? (
              <>
                This will send <strong>one DocuSign email/envelope</strong> to the {entityLabel} with the{" "}
                <strong>client contract</strong> and{" "}
                <strong>one AOA PDF per non-archived property</strong>.
              </>
            ) : (
              <>
                This will send <strong>one DocuSign email/envelope</strong> to the {entityLabel} with{" "}
                <strong>one AOA PDF per non-archived property</strong>. If any property is not eligible
                (e.g. already sent), it may be skipped and reported as failed.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3">
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <div className="font-medium mb-2">Summary</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <span className="text-muted-foreground">
                  {entityLabel === "client" ? "Client" : "Prospect"}:
                </span>{" "}
                {entityName}
              </div>
              <div>
                <span className="text-muted-foreground">Email:</span> {email || "—"}
              </div>
              <div>
                <span className="text-muted-foreground">Properties:</span> {properties.length}
              </div>
            </div>
          </div>

          <div className="rounded-md border border-border">
            <div className="px-3 py-2 text-sm font-medium bg-muted border-b border-border">
              {isDocs ? "Docs to be sent" : "Properties to include"}
            </div>
            {isDocs ? (
              <div className="p-3 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">Client contract</div>
                    <div className="text-muted-foreground">Preview the generated contract PDF.</div>
                  </div>
                  {contractPreviewTo ? (
                    <Button asChild size="sm" variant="outline" disabled={sending}>
                      <NavLink to={contractPreviewTo} target="_blank" rel="noreferrer">
                        Preview
                      </NavLink>
                    </Button>
                  ) : null}
                </div>
                <div className="border-t border-border pt-3">
                  <div className="font-medium mb-2">AOAs (one per property)</div>
                  <EnvelopePropertiesTable
                    properties={properties}
                    previewTo={aoaPreviewTo}
                    previewDisabled={sending}
                  />
                </div>
              </div>
            ) : (
              <div className="max-h-56 overflow-auto">
                <EnvelopePropertiesTable properties={properties} />
              </div>
            )}
          </div>

          <label className="flex items-start gap-2 text-sm">
            <Checkbox
              checked={agree}
              onCheckedChange={(v) => setAgree(v === true)}
              disabled={sending}
              className="mt-0.5"
            />
            <span>
              {isDocs
                ? "I understand this sends a single DocuSign envelope containing the contract and AOAs for all listed properties."
                : `I understand this sends a single DocuSign envelope and the ${entityLabel} will receive an email to sign AOAs for all listed properties.`}
            </span>
          </label>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={sending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              void handleSend();
            }}
            className={!agree ? "opacity-50 pointer-events-none" : ""}
          >
            {sending ? (
              <span className="inline-flex items-center gap-2">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Sending…
              </span>
            ) : isDocs ? (
              "Agree & send docs"
            ) : (
              "Agree & send AOAs"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function EnvelopePropertiesTable({
  properties,
  previewTo,
  previewDisabled,
}: {
  properties: Property[];
  previewTo?: (propertyId: number) => string;
  previewDisabled?: boolean;
}) {
  return (
    <div className={previewTo ? "max-h-56 overflow-auto rounded-md border border-border" : undefined}>
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-background border-b border-border">
          <tr>
            <th className="text-left p-2 font-medium">Account #</th>
            <th className="text-left p-2 font-medium">County</th>
            <th className="text-left p-2 font-medium">Name on CAD</th>
            {previewTo ? <th className="text-right p-2 font-medium">Preview</th> : null}
          </tr>
        </thead>
        <tbody>
          {properties.map((p) => {
            const fields = propertyDisplayFields(p);
            return (
              <tr key={p.id} className="border-b last:border-b-0">
                <td className="p-2">{fields.accountNumber}</td>
                <td className="p-2">{fields.cadCounty}</td>
                <td className="p-2">{fields.nameOnCad}</td>
                {previewTo ? (
                  <td className="p-2 text-right">
                    <Button asChild size="sm" variant="outline" disabled={previewDisabled}>
                      <NavLink to={previewTo(p.id)} target="_blank" rel="noreferrer">
                        Preview
                      </NavLink>
                    </Button>
                  </td>
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
