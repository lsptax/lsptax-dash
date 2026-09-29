import { useQuery } from "@tanstack/react-query";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { QUERY_META_SUPPRESS_GLOBAL_ERROR_TOAST } from "@/routes/ROUTES";
import {
  EMAIL_TEMPLATE_PURPOSE_LABELS,
  getEmailTemplates,
  type EmailTemplatePurpose,
} from "@/api/emailTemplates";

export function EmailTemplateSelect({
  id,
  purpose,
  extraPurposes = [],
  label = "Email template",
  value,
  onChange,
  disabled,
}: {
  id: string;
  purpose?: EmailTemplatePurpose;
  extraPurposes?: EmailTemplatePurpose[];
  label?: string;
  value: string;
  onChange: (key: string) => void;
  disabled?: boolean;
}) {
  const templatesQuery = useQuery({
    queryKey: ["email-templates"],
    queryFn: getEmailTemplates,
    meta: QUERY_META_SUPPRESS_GLOBAL_ERROR_TOAST,
  });
  const allowedPurposes = new Set(
    purpose ? [purpose, "unassigned" as const, ...extraPurposes] : null
  );
  const templates = (templatesQuery.data ?? []).filter((template) => {
    if (!purpose) return true;
    return allowedPurposes.has(template.purpose);
  });

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value || undefined} onValueChange={onChange} disabled={disabled || templatesQuery.isPending}>
        <SelectTrigger id={id}>
          <SelectValue placeholder={templatesQuery.isPending ? "Loading templates…" : "Choose a template"} />
        </SelectTrigger>
        <SelectContent>
          {templates.map((template) => (
            <SelectItem key={template.key} value={template.key}>
              {template.name}
              {purpose ? "" : ` · ${EMAIL_TEMPLATE_PURPOSE_LABELS[template.purpose]}`}
              {template.isBuiltin ? " (default)" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
