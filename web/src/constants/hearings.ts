import type { HearingStatus } from "@/types/hearings";

export const HEARING_STATUS_OPTIONS: { value: HearingStatus; label: string }[] = [
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "ATTENDED", label: "Attended" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "NO_SHOW", label: "No show" },
];

export const HEARING_STATUS_COLORS: Record<HearingStatus, string> = {
  SCHEDULED: "bg-indigo-100 text-indigo-800 border-indigo-200",
  ATTENDED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  CANCELLED: "bg-slate-100 text-slate-700 border-slate-200",
  NO_SHOW: "bg-amber-100 text-amber-900 border-amber-200",
};

export function normalizeHearingStatus(raw: string | null | undefined): HearingStatus {
  const s = (raw ?? "SCHEDULED").trim().toUpperCase();
  if (s === "ATTENDED" || s === "CANCELLED" || s === "NO_SHOW" || s === "SCHEDULED") {
    return s;
  }
  return "SCHEDULED";
}

export function hearingStatusLabel(status: HearingStatus): string {
  return HEARING_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

/** Display hearing date without time. */
export function formatHearingDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** `YYYY-MM-DD` for `<input type="date" />`. */
export function toHearingDateInputValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Convert date input to ISO (noon local avoids timezone day shift). */
export function hearingDateInputToIso(yyyyMmDd: string): string {
  return new Date(`${yyyyMmDd}T12:00:00`).toISOString();
}
