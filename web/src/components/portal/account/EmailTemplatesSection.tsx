import { forwardRef, useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { QUERY_META_SUPPRESS_GLOBAL_ERROR_TOAST } from "@/routes/ROUTES";
import {
  createEmailTemplate,
  deleteEmailTemplate,
  EMAIL_TEMPLATE_PURPOSE_LABELS,
  EMAIL_TEMPLATE_PURPOSE_OPTIONS,
  getEmailTemplates,
  invoiceLogoPreviewHtml,
  placeholdersForPurpose,
  previewEmailTemplate,
  resetEmailTemplate,
  updateEmailTemplate,
  type EmailTemplate,
  type EmailTemplatePurpose,
} from "@/api/emailTemplates";
import { EmailTemplateBodyEditor, placeholderTitle } from "./EmailTemplateBodyEditor";

type Draft = {
  name: string;
  purpose: EmailTemplatePurpose;
  subject: string;
  bodyHtml: string;
};

export default function EmailTemplatesSection({ logoUrl }: { logoUrl: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const subjectRef = useRef<HTMLInputElement>(null);
  const [activeKey, setActiveKey] = useState("invoice_delivery");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [resetKey, setResetKey] = useState<string | null>(null);
  const [deleteKey, setDeleteKey] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPurpose, setNewPurpose] = useState<EmailTemplatePurpose>("unassigned");
  const [preview, setPreview] = useState({ subject: "", html: "" });

  const templatesQuery = useQuery({
    queryKey: ["email-templates"],
    queryFn: getEmailTemplates,
    meta: QUERY_META_SUPPRESS_GLOBAL_ERROR_TOAST,
  });

  const templates = templatesQuery.data;
  const active = templates?.find((template) => template.key === activeKey) ?? templates?.[0];
  const draft = active ? drafts[active.key] : undefined;

  useEffect(() => {
    if (!templates?.length) return;
    setDrafts((current) => {
      const next = { ...current };
      for (const template of templates) {
        if (!next[template.key]) {
          next[template.key] = {
            name: template.name,
            purpose: template.purpose,
            subject: template.subject,
            bodyHtml: template.bodyHtml,
          };
        }
      }
      return next;
    });
  }, [templates]);

  useEffect(() => {
    if (!active || !draft) return;
    const placeholders = placeholdersForPurpose(draft.purpose, templates);
    const resolved = placeholders.length ? placeholders : active.placeholders;
    const timer = window.setTimeout(() => {
      const values = sampleValues(resolved, logoUrl);
      const rawTokens = resolved.filter((item) => item.raw).map((item) => item.token);
      setPreview({
        subject: previewEmailTemplate(draft.subject, values, { escape: false }),
        html: previewEmailTemplate(draft.bodyHtml, values, { rawTokens }),
      });
    }, 200);
    return () => window.clearTimeout(timer);
  }, [active, draft, logoUrl, templates]);

  function updateDraft(key: string, patch: Partial<Draft>) {
    setDrafts((current) => ({
      ...current,
      [key]: { ...(current[key] || { name: "", purpose: "unassigned", subject: "", bodyHtml: "" }), ...patch },
    }));
  }

  function insertSubjectPlaceholder(token: string) {
    if (!active || !draft) return;
    const snippet = `{{${token}}}`;
    const element = subjectRef.current;
    const currentValue = draft.subject;
    const start = element?.selectionStart ?? currentValue.length;
    const end = element?.selectionEnd ?? currentValue.length;
    const next = currentValue.slice(0, start) + snippet + currentValue.slice(end);
    updateDraft(active.key, { subject: next });
    window.requestAnimationFrame(() => {
      element?.focus();
      const cursor = start + snippet.length;
      element?.setSelectionRange(cursor, cursor);
    });
  }

  async function save(template: EmailTemplate) {
    const current = drafts[template.key];
    if (!current) return;
    setSaving(template.key);
    try {
      const saved = await updateEmailTemplate(template.key, current);
      setDrafts((prev) => ({
        ...prev,
        [saved.key]: {
          name: saved.name,
          purpose: saved.purpose,
          subject: saved.subject,
          bodyHtml: saved.bodyHtml,
        },
      }));
      queryClient.setQueryData<EmailTemplate[]>(["email-templates"], (existing) =>
        existing?.map((item) => (item.key === saved.key ? saved : item))
      );
      toast({ title: `${saved.name} saved` });
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "Could not save email template",
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  }

  async function restoreDefault(key: string) {
    setSaving(`reset:${key}`);
    try {
      const saved = await resetEmailTemplate(key);
      setDrafts((prev) => ({
        ...prev,
        [saved.key]: {
          name: saved.name,
          purpose: saved.purpose,
          subject: saved.subject,
          bodyHtml: saved.bodyHtml,
        },
      }));
      queryClient.setQueryData<EmailTemplate[]>(["email-templates"], (existing) =>
        existing?.map((item) => (item.key === saved.key ? saved : item))
      );
      toast({ title: `${saved.name} restored` });
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "Could not reset email template",
        variant: "destructive",
      });
    } finally {
      setSaving(null);
      setResetKey(null);
    }
  }

  function openCreateDialog() {
    setNewName("");
    setNewPurpose("unassigned");
    setCreateOpen(true);
  }

  async function createTemplate() {
    setSaving("create");
    try {
      const created = await createEmailTemplate({ name: newName, purpose: newPurpose });
      setDrafts((prev) => ({
        ...prev,
        [created.key]: {
          name: created.name,
          purpose: created.purpose,
          subject: created.subject,
          bodyHtml: created.bodyHtml,
        },
      }));
      queryClient.setQueryData<EmailTemplate[]>(["email-templates"], (existing) => [
        ...(existing ?? []),
        created,
      ]);
      setActiveKey(created.key);
      setCreateOpen(false);
      setNewName("");
      setNewPurpose("unassigned");
      toast({ title: `${created.name} created` });
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "Could not create email template",
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  }

  async function removeTemplate(key: string) {
    setSaving(`delete:${key}`);
    try {
      await deleteEmailTemplate(key);
      queryClient.setQueryData<EmailTemplate[]>(["email-templates"], (existing) =>
        existing?.filter((item) => item.key !== key)
      );
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setActiveKey("invoice_delivery");
      setDeleteKey(null);
      toast({ title: "Template deleted" });
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "Could not delete email template",
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  }

  const saved = templates?.find((template) => template.key === active?.key);
  const dirty = Boolean(
    saved &&
      draft &&
      (draft.subject !== saved.subject ||
        draft.bodyHtml !== saved.bodyHtml ||
        draft.name !== saved.name ||
        draft.purpose !== saved.purpose)
  );
  const placeholders = placeholdersForPurpose(draft?.purpose ?? "unassigned", templates);

  return (
    <section id="email-templates" className="rounded-xl border bg-card shadow-sm">
      <header className="border-b px-5 py-4">
        <h2 className="text-base font-semibold">Email templates</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Invoice and payment acknowledgement emails. Write the message as it should read.
          Fields such as client name are filled in when the email is sent.
        </p>
      </header>

      <div className="space-y-4 px-5 py-4">
      {templatesQuery.error ? (
        <p className="text-sm text-destructive">
          {templatesQuery.error instanceof Error
            ? templatesQuery.error.message
            : "Failed to load email templates"}
        </p>
      ) : null}

      {templatesQuery.isPending ? (
        <p className="text-sm text-muted-foreground">Loading email templates…</p>
      ) : null}

      {templates && active && draft ? (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 space-y-1.5">
              <Label htmlFor="email-template-picker">Template</Label>
              <Select value={active.key} onValueChange={setActiveKey}>
                <SelectTrigger id="email-template-picker">
                  <SelectValue placeholder="Choose a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.key} value={template.key}>
                      {template.name}
                      {template.isBuiltin ? " (default)" : ""}
                      {" · "}
                      {EMAIL_TEMPLATE_PURPOSE_LABELS[template.purpose]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="button" variant="outline" onClick={openCreateDialog}>
              New template
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="email-template-name">Name</Label>
              <Input
                id="email-template-name"
                value={draft.name}
                onChange={(event) => updateDraft(active.key, { name: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email-template-purpose">Used for</Label>
              <Select
                value={draft.purpose}
                disabled={active.isBuiltin}
                onValueChange={(value) =>
                  updateDraft(active.key, { purpose: value as EmailTemplatePurpose })
                }
              >
                <SelectTrigger id="email-template-purpose">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMAIL_TEMPLATE_PURPOSE_OPTIONS.map((purpose) => (
                    <SelectItem key={purpose} value={purpose}>
                      {EMAIL_TEMPLATE_PURPOSE_LABELS[purpose]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid items-start gap-4 xl:grid-cols-2">
            <div className="min-w-0 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email-template-subject">Subject</Label>
                <HighlightedTemplateInput
                  ref={subjectRef}
                  id="email-template-subject"
                  value={draft.subject}
                  onChange={(value) => updateDraft(active.key, { subject: value })}
                />
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Insert in subject</span>
                  {placeholders
                    .filter((placeholder) => !placeholder.raw)
                    .map((placeholder) => (
                      <button
                        key={placeholder.token}
                        type="button"
                        className="rounded-full border px-2 py-0.5 text-xs font-medium text-[#0c7ea3] hover:bg-accent dark:text-[#8adcf0]"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => insertSubjectPlaceholder(placeholder.token)}
                      >
                        {placeholderTitle(placeholder)}
                      </button>
                    ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email-template-body">Message</Label>
                <EmailTemplateBodyEditor
                  key={active.key}
                  value={draft.bodyHtml}
                  placeholders={placeholders}
                  onChange={(bodyHtml) => updateDraft(active.key, { bodyHtml })}
                />
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-4">
                {dirty ? (
                  <span className="mr-auto text-xs text-muted-foreground">Unsaved changes</span>
                ) : null}
                {active.isBuiltin ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={saving !== null}
                    onClick={() => setResetKey(active.key)}
                  >
                    Restore default
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={saving !== null}
                    onClick={() => setDeleteKey(active.key)}
                  >
                    Delete
                  </Button>
                )}
                <Button
                  type="button"
                  disabled={saving !== null || !dirty || !draft.subject.trim() || !draft.bodyHtml.trim()}
                  onClick={() => save(active)}
                >
                  {saving === active.key ? "Saving…" : "Save template"}
                </Button>
              </div>
            </div>

            <div className="min-w-0 xl:sticky xl:top-4">
              <div className="overflow-hidden rounded-lg border bg-background">
                <div className="border-b px-3 py-2.5">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                    Preview
                  </p>
                  <p className="mt-1 text-sm font-medium leading-snug">
                    {preview.subject || "No subject"}
                  </p>
                </div>
                <iframe
                  title={`${active.name} preview`}
                  sandbox=""
                  srcDoc={`<!DOCTYPE html><html><body style="margin:16px;font-family:Arial,sans-serif;font-size:14px;line-height:1.45;color:#111;">${preview.html}</body></html>`}
                  className="h-[min(68vh,36rem)] min-h-80 w-full bg-white"
                />
              </div>
            </div>
          </div>

          <AlertDialog open={resetKey === active.key} onOpenChange={(open) => !open && setResetKey(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Restore the default {active.name.toLowerCase()}?</AlertDialogTitle>
                <AlertDialogDescription>
                  The saved subject and body will be replaced with the built-in template.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={saving !== null}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={saving !== null}
                  onClick={(event) => {
                    event.preventDefault();
                    void restoreDefault(active.key);
                  }}
                >
                  {saving === `reset:${active.key}` ? "Restoring…" : "Restore default"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog open={deleteKey === active.key} onOpenChange={(open) => !open && setDeleteKey(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {active.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This template will be removed. Sends that used it will need another template.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={saving !== null}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={saving !== null}
                  onClick={(event) => {
                    event.preventDefault();
                    void removeTemplate(active.key);
                  }}
                >
                  {saving === `delete:${active.key}` ? "Deleting…" : "Delete template"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Dialog
            open={createOpen}
            onOpenChange={(open) => {
              setCreateOpen(open);
              if (!open) {
                setNewName("");
                setNewPurpose("unassigned");
              }
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New email template</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="new-template-name">Name</Label>
                  <Input
                    id="new-template-name"
                    value={newName}
                    onChange={(event) => setNewName(event.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-template-purpose">Used for</Label>
                  <Select
                    value={newPurpose}
                    onValueChange={(value) => setNewPurpose(value as EmailTemplatePurpose)}
                  >
                    <SelectTrigger id="new-template-purpose">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EMAIL_TEMPLATE_PURPOSE_OPTIONS.map((purpose) => (
                        <SelectItem key={purpose} value={purpose}>
                          {EMAIL_TEMPLATE_PURPOSE_LABELS[purpose]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={saving !== null || !newName.trim()}
                  onClick={() => void createTemplate()}
                >
                  {saving === "create" ? "Creating…" : "Create template"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      ) : null}
      </div>
    </section>
  );
}

function sampleValues(
  placeholders: EmailTemplate["placeholders"],
  logoUrl: string
): Record<string, string> {
  const values: Record<string, string> = {};
  for (const placeholder of placeholders) {
    values[placeholder.token] = placeholder.token === "logo" ? invoiceLogoPreviewHtml(logoUrl) : placeholder.sample;
  }
  return values;
}

const PLACEHOLDER_TOKEN = /\{\{\s*[a-zA-Z0-9_]+\s*\}\}/g;

function renderHighlightedTemplate(value: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = new RegExp(PLACEHOLDER_TOKEN.source, "g");
  let last = 0;
  let index = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(value))) {
    if (match.index > last) nodes.push(value.slice(last, match.index));
    nodes.push(
      <span key={index} className="text-[#14ADD6]">
        {match[0]}
      </span>
    );
    index += 1;
    last = match.index + match[0].length;
  }
  if (last < value.length) nodes.push(value.slice(last));
  return nodes;
}

const editorCaret = "bg-transparent text-transparent selection:bg-primary/30";

const HighlightedTemplateInput = forwardRef<
  HTMLInputElement,
  {
    id: string;
    value: string;
    onChange: (value: string) => void;
  }
>(function HighlightedTemplateInput({ id, value, onChange }, ref) {
  return (
    <div className="relative h-9 overflow-hidden rounded-md border border-input bg-background shadow-none focus-within:ring-1 focus-within:ring-ring">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center overflow-hidden whitespace-pre px-3 text-sm text-foreground"
      >
        {renderHighlightedTemplate(value)}
      </div>
      <input
        ref={ref}
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="off"
        spellCheck={false}
        style={{ caretColor: "hsl(var(--foreground))" }}
        className={cn("relative h-9 w-full px-3 text-sm outline-none", editorCaret)}
      />
    </div>
  );
});
