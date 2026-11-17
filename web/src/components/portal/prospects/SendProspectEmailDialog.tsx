import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LoaderCircle, Mail, RefreshCw, Send } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { EmailTemplateSelect } from "@/components/portal/account/EmailTemplateSelect";
import { getEmailTemplates, type EmailTemplate } from "@/api/emailTemplates";
import {
  getProspectEmailRecipients,
  sendProspectEmail,
  type ProspectEmailRecipient,
} from "@/api/prospectEmail";
import { QUERY_META_SUPPRESS_GLOBAL_ERROR_TOAST } from "@/routes/ROUTES";

/** Prefer a template assigned to prospects, then one named "prospect". */
function defaultProspectTemplateKey(templates: EmailTemplate[] | undefined) {
  if (!templates?.length) return "";
  const assigned = templates.find((template) => template.purpose === "prospect");
  if (assigned) return assigned.key;
  const named = templates.find(
    (template) => template.purpose === "unassigned" && /prospect/i.test(template.name)
  );
  return named?.key ?? "";
}

export function SendProspectEmailDialog({
  prospectId,
  prospectName,
}: {
  prospectId: number;
  prospectName: string;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [templateKey, setTemplateKey] = useState("");
  const [recipients, setRecipients] = useState<ProspectEmailRecipient[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [isArchived, setIsArchived] = useState(false);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const templatesQuery = useQuery({
    queryKey: ["email-templates"],
    queryFn: getEmailTemplates,
    enabled: open,
    meta: QUERY_META_SUPPRESS_GLOBAL_ERROR_TOAST,
  });

  const selectedRecipients = useMemo(
    () => recipients.filter((recipient) => selectedEmails.has(recipient.email)),
    [recipients, selectedEmails]
  );

  const loadRecipients = async () => {
    setLoadingRecipients(true);
    try {
      const result = await getProspectEmailRecipients(prospectId);
      setRecipients(result.recipients);
      setIsArchived(result.isArchived);
      setSelectedEmails(
        new Set(result.isArchived ? [] : result.recipients.map((recipient) => recipient.email))
      );
    } catch (error) {
      setRecipients([]);
      setSelectedEmails(new Set());
      toast({
        title: "Could not load recipients",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingRecipients(false);
    }
  };

  useEffect(() => {
    if (open) void loadRecipients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, prospectId]);

  useEffect(() => {
    if (open && !templateKey) setTemplateKey(defaultProspectTemplateKey(templatesQuery.data));
  }, [open, templateKey, templatesQuery.data]);

  const changeOpen = (next: boolean) => {
    if (isSending) return;
    // Pick the template fresh on each open, in case the last one was deleted or reassigned.
    if (!next) setTemplateKey("");
    setOpen(next);
  };

  const toggleRecipient = (email: string, checked: boolean) => {
    setSelectedEmails((current) => {
      const next = new Set(current);
      if (checked) next.add(email);
      else next.delete(email);
      return next;
    });
  };

  const handleSend = async () => {
    setIsSending(true);
    try {
      const result = await sendProspectEmail({
        prospectId,
        templateKey,
        recipientEmails: selectedRecipients.map((recipient) => recipient.email),
      });
      const failures = result.data.failed
        .map((failure) => `${failure.email}: ${failure.error}`)
        .join("; ");
      toast({
        title: result.message,
        description: failures || undefined,
        variant: failures ? "destructive" : undefined,
      });
      setTemplateKey("");
      setOpen(false);
    } catch (error) {
      toast({
        title: "Could not send email",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Mail />
        Send email
      </Button>
      <Dialog open={open} onOpenChange={changeOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Send prospect email</DialogTitle>
            <DialogDescription>
              Choose a template and the addresses for {prospectName || "this prospect"}. Prospect
              and unassigned templates are listed.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <EmailTemplateSelect
              id="prospect-email-template"
              purpose="prospect"
              value={templateKey}
              onChange={setTemplateKey}
              disabled={isSending}
            />

            <div className="rounded-lg border p-3">
              <p className="font-medium">
                {loadingRecipients
                  ? "Loading recipients…"
                  : `${selectedRecipients.length} email${selectedRecipients.length === 1 ? "" : "s"}`}
              </p>
              <p className="text-sm text-muted-foreground">
                Each selected address gets its own copy of the email.
              </p>
            </div>

            <div className="max-h-[360px] overflow-auto rounded-lg border">
              {loadingRecipients ? (
                <div className="flex items-center justify-center gap-2 p-8 text-muted-foreground">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Loading recipients...
                </div>
              ) : recipients.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  This prospect has no email address. Add one on the prospect's edit page.
                </div>
              ) : (
                recipients.map((recipient) => (
                  <div
                    key={recipient.email}
                    className="flex items-start gap-3 border-b p-3 last:border-b-0"
                  >
                    <Checkbox
                      checked={selectedEmails.has(recipient.email)}
                      disabled={isArchived || isSending}
                      onCheckedChange={(checked) => toggleRecipient(recipient.email, checked === true)}
                      aria-label={`Select ${recipient.email}`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{prospectName || "Prospect"}</p>
                        <Badge variant="outline">{recipient.label}</Badge>
                        {isArchived ? <Badge variant="destructive">Archived</Badge> : null}
                      </div>
                      <p className="text-sm text-muted-foreground">{recipient.email}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              disabled={isSending || loadingRecipients}
              onClick={() => void loadRecipients()}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button variant="outline" disabled={isSending} onClick={() => changeOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                isSending || loadingRecipients || !templateKey || selectedRecipients.length === 0
              }
              onClick={() => void handleSend()}
            >
              {isSending ? (
                <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {isSending ? "Sending..." : "Send selected"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
