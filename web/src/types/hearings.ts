export type HearingStatus = "SCHEDULED" | "ATTENDED" | "CANCELLED" | "NO_SHOW";

/** Row from GET /api/hearings (flat) or compact row on GET /api/property. */
export interface Hearing {
  id: number;
  propertyId: number;
  date: string;
  status: HearingStatus;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  /** Set when soft-deleted; active API responses omit deleted rows. */
  deletedAt?: string | null;
  clientId?: number;
  clientName?: string;
  clientNumber?: string;
  accountNumber?: string;
  propertyAddress?: string;
}

export interface HearingStats {
  meetingsThisWeek: number;
  meetingsToday: number;
  totalScheduled: number;
  weekStart: string;
  weekEnd: string;
}
