import { useState } from "react";
import { addHearing, editHearing } from "@/api/api";
import { HearingDeleteButton } from "@/components/portal/hearings/HearingDeleteButton";
import type { Hearing } from "@/types/hearings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HearingStatusCell } from "@/components/portal/hearings/HearingStatusCell";
import {
  formatHearingDate,
  HEARING_STATUS_OPTIONS,
  hearingDateInputToIso,
  toHearingDateInputValue,
} from "@/constants/hearings";
import { useToast } from "@/hooks/use-toast";
import { CalendarPlus, LoaderCircle } from "lucide-react";

interface PropertyHearingsSectionProps {
  propertyId: number | string;
  hearings: Hearing[];
  lifecyclePhaseId: string | null | undefined;
  onUpdated: () => void | Promise<void>;
}

export function PropertyHearingsSection({
  propertyId,
  hearings,
  lifecyclePhaseId,
  onUpdated,
}: PropertyHearingsSectionProps) {
  const { toast } = useToast();
  const [dateValue, setDateValue] = useState("");
  const [notes, setNotes] = useState("");
  const [addStatus, setAddStatus] = useState<string>("SCHEDULED");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const canAdd = lifecyclePhaseId === "hearingManagement";
  const sorted = [...hearings]
    .filter((h) => !h.deletedAt)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const handleAdd = async () => {
    if (!dateValue.trim()) {
      toast({ variant: "destructive", title: "Date required", description: "Choose a hearing date." });
      return;
    }
    setSaving(true);
    try {
      await addHearing({
        propertyId: Number(propertyId),
        date: hearingDateInputToIso(dateValue),
        notes: notes.trim() || undefined,
        status: addStatus,
      });
      toast({ title: "Hearing scheduled" });
      setDateValue("");
      setNotes("");
      setAddStatus("SCHEDULED");
      await onUpdated();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Could not add hearing",
        description: err instanceof Error ? err.message : "Try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDateChange = async (hearing: Hearing, newLocal: string) => {
    if (!newLocal.trim()) return;
    setBusyId(hearing.id);
    try {
      await editHearing({
        hearingId: hearing.id,
        date: hearingDateInputToIso(newLocal),
      });
      toast({ title: "Hearing updated" });
      await onUpdated();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Could not update hearing",
        description: err instanceof Error ? err.message : "Try again.",
      });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mt-3 rounded-lg border border-indigo-100 bg-white/80 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Scheduled hearings</p>

      {sorted.length === 0 ? (
        <p className="mt-2 text-xs text-slate-600">No hearing dates on file for this property yet.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {sorted.map((h) => (
            <li
              key={h.id}
              className="flex flex-col gap-2 rounded-md border border-slate-100 bg-slate-50/60 px-2.5 py-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium text-slate-900">{formatHearingDate(h.date)}</p>
                <HearingStatusCell
                  hearingId={h.id}
                  status={h.status}
                  onSuccess={() => void onUpdated()}
                  compact
                />
              </div>
              {h.notes?.trim() ? (
                <p className="text-xs text-slate-600">{h.notes}</p>
              ) : null}
              <div className="flex shrink-0 items-center gap-2">
                <Input
                  type="date"
                  className="h-8 flex-1 min-w-0 text-xs"
                  defaultValue={toHearingDateInputValue(h.date)}
                  disabled={busyId === h.id}
                  onBlur={(e) => {
                    const next = e.target.value;
                    if (next && next !== toHearingDateInputValue(h.date)) {
                      void handleDateChange(h, next);
                    }
                  }}
                  aria-label="Edit hearing date"
                />
                <HearingDeleteButton
                  hearingId={h.id}
                  onSuccess={() => void onUpdated()}
                  disabled={busyId === h.id}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 border-t border-slate-100 pt-3">
        <p className="text-xs font-semibold text-slate-800">Add hearing date</p>
        {!canAdd ? (
          <p className="mt-1 text-xs text-amber-800">
            Move this property to the <strong>Hearing Management</strong> phase before scheduling hearings.
          </p>
        ) : (
          <div className="mt-2 flex flex-col gap-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="text-[10px] font-medium text-muted-foreground" htmlFor={`hearing-date-${propertyId}`}>
                  Date
                </label>
                <Input
                  id={`hearing-date-${propertyId}`}
                  type="date"
                  value={dateValue}
                  onChange={(e) => setDateValue(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="w-full sm:w-36">
                <label className="text-[10px] font-medium text-muted-foreground" htmlFor={`hearing-status-add-${propertyId}`}>
                  Status
                </label>
                <Select value={addStatus} onValueChange={setAddStatus}>
                  <SelectTrigger id={`hearing-status-add-${propertyId}`} className="mt-1 h-9">
                    <SelectValue />
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
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="text-[10px] font-medium text-muted-foreground" htmlFor={`hearing-notes-${propertyId}`}>
                  Notes (optional)
                </label>
                <Input
                  id={`hearing-notes-${propertyId}`}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Room, ARB panel…"
                  className="mt-1"
                />
              </div>
              <Button
                type="button"
                variant="blue"
                size="sm"
                className="gap-1.5 shrink-0"
                disabled={saving || !dateValue}
                onClick={() => void handleAdd()}
              >
                {saving ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <CalendarPlus className="h-4 w-4" />
                )}
                Add
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
