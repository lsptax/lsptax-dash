import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { QUERY_META_SUPPRESS_GLOBAL_ERROR_TOAST } from "@/routes/ROUTES";
import {
  getInfraSettings,
  updateInfraSettings,
  type InfraSettings,
} from "@/api/settings";
import { currentUserCanViewOwnerDashboard } from "@/utils/ownerRole";

export default function SettingsPage() {
  const canEdit = currentUserCanViewOwnerDashboard();
  const { toast } = useToast();
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
      <div className="px-4 sm:px-6 lg:px-8 py-10 max-w-2xl">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Infrastructure settings are limited to management users.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-5 py-4 space-y-3 max-w-3xl">
      {settingsQuery.error ? (
        <div className="rounded-xl border border-destructive/30 bg-card p-4 text-sm text-destructive">
          {settingsQuery.error instanceof Error
            ? settingsQuery.error.message
            : "Failed to load settings"}
        </div>
      ) : null}

      <section id="brevo" className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
        <div>
          <h2 className="text-sm font-semibold">Brevo</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Invoice email sender details. The API key stays on the server.
          </p>
        </div>
        <Field
          id="brevo-sender-email"
          label="Sender email"
          value={brevo.senderEmail}
          onChange={(value) => setBrevo((prev) => ({ ...prev, senderEmail: value }))}
        />
        <Field
          id="brevo-sender-name"
          label="Sender name"
          value={brevo.senderName}
          onChange={(value) => setBrevo((prev) => ({ ...prev, senderName: value }))}
        />
        <Field
          id="brevo-sms"
          label="SMS sender"
          value={brevo.smsSender}
          onChange={(value) => setBrevo((prev) => ({ ...prev, smsSender: value }))}
        />
        <Field
          id="brevo-logo"
          label="Invoice email logo URL"
          value={brevo.invoiceLogoUrl}
          onChange={(value) => setBrevo((prev) => ({ ...prev, invoiceLogoUrl: value }))}
        />
        <Button
          type="button"
          disabled={saving !== null}
          onClick={() => saveGroup("brevo", brevo)}
        >
          {saving === "brevo" ? "Saving…" : "Save Brevo"}
        </Button>
      </section>

      <section id="supabase" className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
        <div>
          <h2 className="text-sm font-semibold">Supabase</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Project URL only. Service and publishable keys stay on the server.
          </p>
        </div>
        <Field
          id="supabase-url"
          label="Project URL"
          value={supabase.url}
          onChange={(value) => setSupabase((prev) => ({ ...prev, url: value }))}
        />
        <Button
          type="button"
          disabled={saving !== null}
          onClick={() => saveGroup("supabase", supabase)}
        >
          {saving === "supabase" ? "Saving…" : "Save Supabase"}
        </Button>
      </section>

      <section id="docusign" className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
        <div>
          <h2 className="text-sm font-semibold">DocuSign</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Demo vs production hosts and send rules. Client, account, and user IDs
            stay on the server.
          </p>
        </div>
        <Field
          id="ds-auth"
          label="Auth server"
          value={docusign.authServer}
          onChange={(value) => setDocusign((prev) => ({ ...prev, authServer: value }))}
        />
        <Field
          id="ds-rest"
          label="REST base URL"
          value={docusign.restBaseUrl}
          onChange={(value) => setDocusign((prev) => ({ ...prev, restBaseUrl: value }))}
        />
        <ToggleRow
          id="ds-demo"
          label="Allow demo endpoints in production"
          checked={docusign.allowDemoInProduction}
          onChange={(checked) =>
            setDocusign((prev) => ({ ...prev, allowDemoInProduction: checked }))
          }
        />
        <ToggleRow
          id="ds-multi-contract"
          label="Allow multiple client contract sends"
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
          checked={docusign.allowMultipleAoaSends}
          onChange={(checked) =>
            setDocusign((prev) => ({ ...prev, allowMultipleAoaSends: checked }))
          }
        />
        <Button
          type="button"
          disabled={saving !== null}
          onClick={() => saveGroup("docusign", docusign)}
        >
          {saving === "docusign" ? "Saving…" : "Save DocuSign"}
        </Button>
      </section>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
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
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
      <Label htmlFor={id} className="font-normal">
        {label}
      </Label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
