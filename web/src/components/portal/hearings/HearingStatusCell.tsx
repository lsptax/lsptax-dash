import { useState } from "react";
import { editHearing } from "@/api/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  HEARING_STATUS_COLORS,
  HEARING_STATUS_OPTIONS,
  hearingStatusLabel,
  normalizeHearingStatus,
} from "@/constants/hearings";
import type { HearingStatus } from "@/types/hearings";
import { cn } from "@/lib/utils";
import { LoaderCircle } from "lucide-react";

export function HearingStatusCell({
  hearingId,
  status: rawStatus,
  onSuccess,
  compact,
}: {
  hearingId: number;
  status: string | undefined;
  onSuccess?: () => void;
  compact?: boolean;
}) {
  const { toast } = useToast();
  const status = normalizeHearingStatus(rawStatus);
  const [saving, setSaving] = useState(false);

  const handleChange = async (next: string) => {
    const normalized = normalizeHearingStatus(next);
    if (normalized === status) return;
    setSaving(true);
    try {
      await editHearing({ hearingId, status: normalized });
      toast({
        title: "Status updated",
        description: `Hearing marked as ${hearingStatusLabel(normalized)}.`,
      });
      onSuccess?.();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Could not update status",
        description: err instanceof Error ? err.message : "Try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const colorClass = HEARING_STATUS_COLORS[status as HearingStatus];

  return (
    <div className="flex items-center gap-1.5">
      {saving ? <LoaderCircle className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" /> : null}
      <Select value={status} onValueChange={(v) => void handleChange(v)} disabled={saving}>
        <SelectTrigger
          className={cn(
            "h-8 border font-medium text-xs",
            compact ? "w-[7.5rem]" : "w-[9.5rem]",
            colorClass,
          )}
        >
          <SelectValue>{hearingStatusLabel(status)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {HEARING_STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
