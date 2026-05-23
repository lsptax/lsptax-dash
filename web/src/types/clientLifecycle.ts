/** Lifecycle object from GET /api/property (`lifecycle` on the property response). */

/** One end of a transition (`from` / `to`); `null` ids mean none / not set. */
export interface LifecycleTransitionEnds {
  phase: string | null;
  step: string | null;
}

/** Canonical history row from backend (`lifecycle.history`). */
export interface ClientLifecycleHistoryTransition {
  at: string;
  from: LifecycleTransitionEnds;
  to: LifecycleTransitionEnds;
  notes?: string | null;
}

/** Flexible phase/step reference from API (trimmed variants allowed). */
export interface ClientLifecyclePhaseRef {
  id?: string;
  phaseId?: string;
  title?: string;
  label?: string;
  steps?: Array<{
    id?: string;
    stepId?: string;
    label?: string;
    title?: string;
  }>;
}

export interface ClientLifecycleHistoryEntry extends Record<string, unknown> {
  at?: string;
  from?: unknown;
  to?: unknown;
  notes?: string;
  lifecyclePhase?: string;
  lifecycleStep?: string;
  phaseId?: string;
  stepId?: string;
  lifecycleNotes?: string;
  completedAt?: string;
}

export interface PropertyLifecyclePayload {
  phaseId?: string | null;
  stepId?: string | null;
  completedAt?: string | null;
  notes?: string | null;
  history?: ClientLifecycleHistoryEntry[] | null;
  /** Reference labels — same semantics as frontend constants when omitted. */
  phases?: unknown[] | null;
}

/** @deprecated Use PropertyLifecyclePayload — lifecycle is per property. */
export type ClientLifecyclePayload = PropertyLifecyclePayload;
