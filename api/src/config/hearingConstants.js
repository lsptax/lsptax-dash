/** Prisma `HearingStatus` values (stored on `hearings.status`). */
export const HEARING_STATUSES = ["SCHEDULED", "ATTENDED", "CANCELLED", "NO_SHOW"];

export const HEARING_STATUS_DEFAULT = "SCHEDULED";

const HEARING_STATUS_SET = new Set(HEARING_STATUSES);

/** Normalize API input to a valid status, or null if invalid. */
export function parseHearingStatusInput(raw) {
  if (raw == null || raw === "") return null;
  const s = String(raw).trim().toUpperCase().replace(/-/g, "_");
  if (HEARING_STATUS_SET.has(s)) return s;
  return null;
}
