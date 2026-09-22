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
  value,
  onChange,
  disabled,
}: {
  id: string;
  purpose?: EmailTemplatePurpose;
  value: string;
  onChange: (key: string) => void;
  disabled?: boolean;
}) {
  const templatesQuery = useQuery({
    queryKey: ["email-templates"],
    queryFn: getEmailTemplates,
    meta: QUERY_META_SUPPRESS_GLOBAL_ERROR_TOAST,
  });
  const templates = (templatesQuery.data ?? []).filter((template) =>
    purpose ? template.purpose === purpose || template.purpose === "unassigned" : true
  );

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Email template</Label>
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
