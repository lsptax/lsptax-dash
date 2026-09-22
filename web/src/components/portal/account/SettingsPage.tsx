import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Database, FileSignature, Mail, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { QUERY_META_SUPPRESS_GLOBAL_ERROR_TOAST } from "@/routes/ROUTES";
import {
  getInfraSettings,
  updateInfraSettings,
  type InfraSettings,
} from "@/api/settings";
import { currentUserCanViewOwnerDashboard } from "@/utils/ownerRole";
import EmailTemplatesSection from "@/components/portal/account/EmailTemplatesSection";

type SectionId = "email" | "brevo" | "supabase" | "docusign";

const SECTIONS: {
  id: SectionId;
  hash: string;
  label: string;
  hint: string;
  icon: typeof Mail;
}[] = [
  {
    id: "email",
    hash: "email-templates",
    label: "Email templates",
    hint: "Invoice and payment emails",
    icon: Mail,
  },
  {
    id: "brevo",
    hash: "brevo",
    label: "Brevo",
    hint: "Sender, SMS, and logo",
    icon: Send,
  },
  {
    id: "supabase",
    hash: "supabase",
    label: "Supabase",
    hint: "Project URL",
    icon: Database,
  },
  {
    id: "docusign",
    hash: "docusign",
    label: "DocuSign",
    hint: "Hosts and send rules",
    icon: FileSignature,
  },
];

function sectionFromHash(hash: string): SectionId {
  const id = hash.replace(/^#/, "");
  const match = SECTIONS.find((section) => section.hash === id || section.id === id);
  return match?.id ?? "email";
}

export default function SettingsPage() {
  const canEdit = currentUserCanViewOwnerDashboard();
  const { toast } = useToast();
  const [section, setSection] = useState<SectionId>(() =>
    typeof window === "undefined" ? "email" : sectionFromHash(window.location.hash)
  );
  const [brevo, setBrevo] = useState({
    senderEmail: "",
    senderName: "",
    smsSender: "",
    invoiceLogoUrl: "",
  });
  const [supabase, setSupabase] = useState({ url: "" });
  const [docusign, setDocusign] = useState({
    authServer: "",
    restBaseUrl: "",
    allowDemoInProduction: false,
    allowMultipleClientContractSends: true,
    allowMultipleAoaSends: true,
  });
  const [saving, setSaving] = useState<string | null>(null);

  const settingsQuery = useQuery({
    queryKey: ["infra-settings"],
    queryFn: getInfraSettings,
    enabled: canEdit,
    meta: QUERY_META_SUPPRESS_GLOBAL_ERROR_TOAST,
  });

  useEffect(() => {
    function onHashChange() {
      setSection(sectionFromHash(window.location.hash));
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    const data = settingsQuery.data;
    if (!data) return;
    setBrevo({
      senderEmail: data.brevo.senderEmail || "",
      senderName: data.brevo.senderName || "",
      smsSender: data.brevo.smsSender || "",
      invoiceLogoUrl: data.brevo.invoiceLogoUrl || "",
    });
    setSupabase({ url: data.supabase.url || "" });
    setDocusign({
      authServer: data.docusign.authServer || "",
      restBaseUrl: data.docusign.restBaseUrl || "",
      allowDemoInProduction: Boolean(data.docusign.allowDemoInProduction),
      allowMultipleClientContractSends: Boolean(
        data.docusign.allowMultipleClientContractSends
      ),
      allowMultipleAoaSends: Boolean(data.docusign.allowMultipleAoaSends),
    });
  }, [settingsQuery.data]);

  async function saveGroup(group: keyof InfraSettings, values: object) {
    setSaving(group);
    try {
      await updateInfraSettings({ [group]: values });
      await settingsQuery.refetch();
      toast({ title: "Settings saved" });
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "Could not save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(null);
    }
  }

  if (!canEdit) {
    return (
      <div className="w-full px-4 py-4 sm:px-5">
        <div className="max-w-lg rounded-xl border bg-card p-5 text-sm text-muted-foreground">
          Infrastructure settings are limited to management users.
        </div>
      </div>
    );
  }

  const settingsReady = Boolean(settingsQuery.data);

  return (
    <div className="w-full px-4 py-4 sm:px-5">
      {settingsQuery.error ? (
        <div className="mb-3 rounded-xl border border-destructive/30 bg-card p-4 text-sm text-destructive">
          {settingsQuery.error instanceof Error
            ? settingsQuery.error.message
            : "Failed to load settings"}
        </div>
      ) : null}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <nav
          aria-label="Settings sections"
          className="flex gap-1 overflow-x-auto rounded-xl border bg-card p-1.5 lg:sticky lg:top-4 lg:w-60 lg:shrink-0 lg:flex-col"
        >
          {SECTIONS.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <a
                key={item.id}
                href={`#${item.hash}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-w-[9.5rem] items-start gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors lg:min-w-0",
                  active
                    ? "bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", active && "text-primary")} aria-hidden />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{item.label}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{item.hint}</span>
                </span>
              </a>
            );
          })}
        </nav>

        <div className="min-w-0 flex-1">
          {section === "email" ? <EmailTemplatesSection logoUrl={brevo.invoiceLogoUrl} /> : null}

          {section === "brevo" ? (
            <Panel
              title="Brevo"
              description="Invoice email sender details. The API key stays on the server."
              footer={
                settingsReady ? (
                  <Button
                    type="button"
                    disabled={saving !== null}
                    onClick={() => saveGroup("brevo", brevo)}
                  >
                    {saving === "brevo" ? "Saving…" : "Save Brevo"}
                  </Button>
                ) : null
              }
            >
              {settingsReady ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      id="brevo-sender-email"
                      label="Sender email"
                      hint="From address on invoice emails."
                      value={brevo.senderEmail}
                      onChange={(value) => setBrevo((prev) => ({ ...prev, senderEmail: value }))}
                    />
                    <Field
                      id="brevo-sender-name"
                      label="Sender name"
                      hint="Name recipients see in their inbox."
                      value={brevo.senderName}
                      onChange={(value) => setBrevo((prev) => ({ ...prev, senderName: value }))}
                    />
                    <Field
                      id="brevo-sms"
                      label="SMS sender"
                      hint="Sender label on invoice text messages."
                      value={brevo.smsSender}
                      onChange={(value) => setBrevo((prev) => ({ ...prev, smsSender: value }))}
                    />
                    <Field
                      id="brevo-logo"
                      label="Invoice email logo URL"
                      hint="Used where the invoice template includes {{logo}}."
                      value={brevo.invoiceLogoUrl}
                      onChange={(value) => setBrevo((prev) => ({ ...prev, invoiceLogoUrl: value }))}
                    />
                  </div>
                </>
              ) : settingsQuery.isPending ? (
                <LoadingCopy />
              ) : null}
            </Panel>
          ) : null}

          {section === "supabase" ? (
            <Panel
              title="Supabase"
              description="Project URL only. Service and publishable keys stay on the server."
              footer={
                settingsReady ? (
                  <Button
                    type="button"
                    disabled={saving !== null}
                    onClick={() => saveGroup("supabase", supabase)}
                  >
                    {saving === "supabase" ? "Saving…" : "Save Supabase"}
                  </Button>
                ) : null
              }
            >
              {settingsReady ? (
                <>
                  <Field
                    id="supabase-url"
                    label="Project URL"
                    value={supabase.url}
                    onChange={(value) => setSupabase((prev) => ({ ...prev, url: value }))}
                  />
                </>
              ) : settingsQuery.isPending ? (
                <LoadingCopy />
              ) : null}
            </Panel>
          ) : null}

          {section === "docusign" ? (
            <Panel
              title="DocuSign"
              description="Demo and production hosts, plus send rules. Client, account, and user IDs stay on the server."
              footer={
                settingsReady ? (
                  <Button
                    type="button"
                    disabled={saving !== null}
                    onClick={() => saveGroup("docusign", docusign)}
                  >
                    {saving === "docusign" ? "Saving…" : "Save DocuSign"}
                  </Button>
                ) : null
              }
            >
              {settingsReady ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      id="ds-auth"
                      label="Auth server"
                      hint="Account server, such as account.docusign.com."
                      value={docusign.authServer}
                      onChange={(value) => setDocusign((prev) => ({ ...prev, authServer: value }))}
                    />
                    <Field
                      id="ds-rest"
                      label="REST base URL"
                      hint="API host used to send envelopes."
                      value={docusign.restBaseUrl}
                      onChange={(value) => setDocusign((prev) => ({ ...prev, restBaseUrl: value }))}
                    />
                  </div>
                  <div className="divide-y overflow-hidden rounded-lg border">
                    <ToggleRow
                      id="ds-demo"
                      label="Allow demo endpoints in production"
                      description="Permit the DocuSign developer host while this app is running in production."
                      checked={docusign.allowDemoInProduction}
                      onChange={(checked) =>
                        setDocusign((prev) => ({ ...prev, allowDemoInProduction: checked }))
                      }
                    />
                    <ToggleRow
                      id="ds-multi-contract"
                      label="Allow multiple client contract sends"
                      description="Send another client contract after one was already sent or completed."
                      checked={docusign.allowMultipleClientContractSends}
                      onChange={(checked) =>
                        setDocusign((prev) => ({
                          ...prev,
                          allowMultipleClientContractSends: checked,
                        }))
                      }
                    />
                    <ToggleRow
                      id="ds-multi-aoa"
                      label="Allow multiple AOA sends"
                      description="Send another authorization of agent after one was already sent or completed."
                      checked={docusign.allowMultipleAoaSends}
                      onChange={(checked) =>
                        setDocusign((prev) => ({ ...prev, allowMultipleAoaSends: checked }))
                      }
                    />
                  </div>
                </>
              ) : settingsQuery.isPending ? (
                <LoadingCopy />
              ) : null}
            </Panel>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Panel({
  title,
  description,
  footer,
  children,
}: {
  title: string;
  description: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card shadow-sm">
      <header className="border-b px-5 py-4">
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </header>
      <div className="space-y-4 px-5 py-4">{children}</div>
      {footer ? <div className="flex justify-end border-t px-5 py-3">{footer}</div> : null}
    </section>
  );
}

function LoadingCopy() {
  return <p className="text-sm text-muted-foreground">Loading settings…</p>;
}

function Field({
  id,
  label,
  hint,
  value,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
      />
    </div>
  );
}

function ToggleRow({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-3 py-3">
      <div className="min-w-0 space-y-1">
        <Label htmlFor={id} className="font-medium">
          {label}
        </Label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
