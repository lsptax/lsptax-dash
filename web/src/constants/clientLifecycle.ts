/**
 * Phase/step IDs align with backend `lifecycleConstants` and GET /api/property `lifecycle`.
 * Titles/descriptions mirror docs/Roadmap and docs/api_v2.md.
 */

import type { LifecycleTransitionEnds } from "@/types/clientLifecycle";

export type LifecyclePhaseId =
  | "clientOnboardingAndPropertySetup"
  | "protestAuthorization"
  | "valuationAndProtestInitiation"
  | "hearingManagement"
  | "hearingOutcomeAndResolution"
  | "postHearingFinancialProcess"
  | "keyOperationalCharacteristics";

export type LifecycleStepId =
  | "prospectIdentification"
  | "propertyInformationCollection"
  | "cadDataRetrieval"
  | "agreementPreparation"
  | "agreementExecution"
  | "authorizationPreparation"
  | "authorizationFiling"
  | "noticeValueReceipt"
  | "valueEntryAndRecording"
  | "documentFilingAndStorage"
  | "protestReportGeneration"
  | "protestSubmissionToCounty"
  | "hearingScheduleReceipt"
  | "calendarIntegration"
  | "preHearingVerification"
  | "hearingConducted"
  | "outcomeSettlement"
  | "outcomeBoardOrder"
  | "invoicePreparation"
  | "invoiceIssuance"
  | "paymentCollection"
  | "individualAndBulkActions"
  | "multiStepDependencyProcess"
  | "highImportanceOfTimelines";

export interface LifecycleStepDef {
  id: LifecycleStepId;
  /** Short heading */
  title: string;
  /** One line for clarity */
  description: string;
}

export interface LifecyclePhaseDef {
  id: LifecyclePhaseId;
  order: number;
  /** Full phase name */
  title: string;
  /** Navbar / dense stepper */
  shortTitle: string;
  /** Paragraph context from roadmap */
  summary: string;
  steps: LifecycleStepDef[];
}

export const CLIENT_LIFECYCLE_PHASES: LifecyclePhaseDef[] = [
  {
    id: "clientOnboardingAndPropertySetup",
    order: 1,
    title: "Client Onboarding & Property Setup",
    shortTitle: "Onboarding",
    summary:
      "From first lead through signed agreements: identify the prospect, collect property details, pull CAD data, prepare and execute contracts.",
    steps: [
      {
        id: "prospectIdentification",
        title: "Prospect identification",
        description: "Initial lead or inquiry received.",
      },
      {
        id: "propertyInformationCollection",
        title: "Property information collection",
        description: "Address, ownership details, and basic inputs from the client.",
      },
      {
        id: "cadDataRetrieval",
        title: "CAD data retrieval",
        description: "Official property details (account, jurisdiction, valuation) from CAD.",
      },
      {
        id: "agreementPreparation",
        title: "Agreement preparation",
        description: "Prepare AOA and service contract using collected data.",
      },
      {
        id: "agreementExecution",
        title: "Agreement execution",
        description: "Send to client, receive signed agreement — client officially onboarded.",
      },
    ],
  },
  {
    id: "protestAuthorization",
    order: 2,
    title: "Protest Authorization",
    shortTitle: "Authorization",
    summary: "Prepare and file protest authorization with CAD (online, mail, or system).",
    steps: [
      {
        id: "authorizationPreparation",
        title: "Authorization preparation",
        description: "Prepare protest authorization from CAD records.",
      },
      {
        id: "authorizationFiling",
        title: "Authorization filing",
        description: "Submit authorization to CAD using the appropriate channel.",
      },
    ],
  },
  {
    id: "valuationAndProtestInitiation",
    order: 3,
    title: "Valuation & Protest Initiation",
    shortTitle: "Valuation / Protest",
    summary:
      "Notice values, document filing, internal protest reporting, and submission of declarations to the county.",
    steps: [
      {
        id: "noticeValueReceipt",
        title: "Notice value receipt",
        description: "Receive official notice of appraised value from CAD.",
      },
      {
        id: "valueEntryAndRecording",
        title: "Value entry & recording",
        description: "Enter updated values and store for reference.",
      },
      {
        id: "documentFilingAndStorage",
        title: "Document filing & storage",
        description: "Organize and file all valuation documents received.",
      },
      {
        id: "protestReportGeneration",
        title: "Protest report generation",
        description: "Internal report identifying properties to protest.",
      },
      {
        id: "protestSubmissionToCounty",
        title: "Protest submission to county (CAD)",
        description: "Submit protest declarations via mail, online, or other channels.",
      },
    ],
  },
  {
    id: "hearingManagement",
    order: 4,
    title: "Hearing Management",
    shortTitle: "Hearings",
    summary: "Schedule tracking, calendar integration, and pre-hearing readiness.",
    steps: [
      {
        id: "hearingScheduleReceipt",
        title: "Hearing schedule received",
        description: "Receive hearing dates from county / CAD.",
      },
      {
        id: "calendarIntegration",
        title: "Calendar integration",
        description: "Log hearings into Google Calendar (or team calendar) for tracking.",
      },
      {
        id: "preHearingVerification",
        title: "Pre-hearing verification",
        description: "Confirm documents, evidence, and property details are complete.",
      },
    ],
  },
  {
    id: "hearingOutcomeAndResolution",
    order: 5,
    title: "Hearing Outcome & Resolution",
    shortTitle: "Outcome",
    summary: "Informal or formal hearing completed; record settlement or board order.",
    steps: [
      {
        id: "hearingConducted",
        title: "Hearing conducted",
        description: "Case reviewed via informal or formal process.",
      },
      {
        id: "outcomeSettlement",
        title: "Outcome: settlement",
        description: "Value reduction agreed with the appraisal district.",
      },
      {
        id: "outcomeBoardOrder",
        title: "Outcome: board order",
        description: "Final decision issued by the board.",
      },
    ],
  },
  {
    id: "postHearingFinancialProcess",
    order: 6,
    title: "Post-Hearing Financial Process",
    shortTitle: "Billing",
    summary: "Invoice from savings and fees through payment collection.",
    steps: [
      {
        id: "invoicePreparation",
        title: "Invoice preparation",
        description: "Calculate savings and applicable fee.",
      },
      {
        id: "invoiceIssuance",
        title: "Invoice issuance",
        description: "Send invoice to the client.",
      },
      {
        id: "paymentCollection",
        title: "Payment collection",
        description: "Track and confirm payment completion.",
      },
    ],
  },
  {
    id: "keyOperationalCharacteristics",
    order: 7,
    title: "Key Operational Characteristics",
    shortTitle: "Operations",
    summary:
      "Ongoing practices: bulk vs individual work, step dependencies, and timeline discipline across cases.",
    steps: [
      {
        id: "individualAndBulkActions",
        title: "Individual & bulk actions",
        description: "Authorization and filing often in bulk; hearings and outcomes per property.",
      },
      {
        id: "multiStepDependencyProcess",
        title: "Multi-step dependencies",
        description: "Each stage depends on completion of prior steps.",
      },
      {
        id: "highImportanceOfTimelines",
        title: "High importance of timelines",
        description: "Deadlines, hearing dates, and follow-ups are critical.",
      },
    ],
  },
];

const phaseById = new Map(
  CLIENT_LIFECYCLE_PHASES.map((p) => [p.id, p] as const),
);

export function getPhaseDef(phaseId: string | null | undefined): LifecyclePhaseDef | undefined {
  if (!phaseId) return undefined;
  return phaseById.get(phaseId as LifecyclePhaseId);
}

export function getStepLabel(phaseId: string | null | undefined, stepId: string | null | undefined): string {
  if (!stepId) return "—";
  const phase = getPhaseDef(phaseId);
  const step = phase?.steps.find((s) => s.id === stepId);
  return step?.title ?? stepId;
}

export function getPhaseTitle(phaseId: string | null | undefined): string {
  return getPhaseDef(phaseId)?.title ?? phaseId ?? "—";
}

/** --- Lifecycle API labels (`GET /api/property` `lifecycle.phases`) + resolver --- */

export type LifecycleLabelResolver = {
  phaseTitle: (phaseId: string | null | undefined) => string;
  /** Prefer step label inside `phaseId` when API provides maps. */
  stepLabel: (
    stepId: string | null | undefined,
    phaseId?: string | null | undefined,
  ) => string;
};

function normalizeId(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "string") {
    const t = v.trim();
    return t || undefined;
  }
  return String(v);
}

/**
 * Builds human-readable labels preferring backend `lifecycle.phases`, falling back to this file’s defs.
 */
export function createLifecycleLabelResolver(apiPhases: unknown): LifecycleLabelResolver {
  const phaseTitleById = new Map<string, string>();
  const stepLabelByPhase = new Map<string, Map<string, string>>();

  if (Array.isArray(apiPhases)) {
    for (const p of apiPhases) {
      if (!p || typeof p !== "object") continue;
      const o = p as Record<string, unknown>;
      const pid = normalizeId(o.id ?? o.phaseId);
      if (!pid) continue;

      const pTitleRaw = o.title ?? o.label ?? o.name;
      const phaseTitle =
        typeof pTitleRaw === "string" && pTitleRaw.trim() ? pTitleRaw.trim() : getPhaseTitle(pid);
      phaseTitleById.set(pid, phaseTitle);

      const stepsRaw = o.steps;
      if (Array.isArray(stepsRaw)) {
        const stepMap = new Map<string, string>();
        for (const s of stepsRaw) {
          if (!s || typeof s !== "object") continue;
          const so = s as Record<string, unknown>;
          const sid = normalizeId(so.id ?? so.stepId);
          if (!sid) continue;
          const labSrc = so.label ?? so.title ?? so.name;
          const lab =
            typeof labSrc === "string" && labSrc.trim() ? labSrc.trim() : getStepLabel(pid, sid);
          stepMap.set(sid, lab);
        }
        if (stepMap.size) stepLabelByPhase.set(pid, stepMap);
      }
    }
  }

  return {
    phaseTitle(pid): string {
      if (pid == null) return "—";
      const s = normalizeId(pid);
      if (!s) return "—";
      const fromApi = phaseTitleById.get(s);
      if (fromApi) return fromApi;
      return getPhaseTitle(s);
    },
    stepLabel(sid, phaseId): string {
      if (sid == null) return "—";
      const sidN = normalizeId(sid);
      if (!sidN) return "—";
      const pN = normalizeId(phaseId ?? "");
      if (pN) {
        const pm = stepLabelByPhase.get(pN);
        const lbl = pm?.get(sidN);
        if (lbl) return lbl;
        return getStepLabel(pN, sidN);
      }
      return getStepLabelGlobal(sidN);
    },
  };
}

export function coerceTransitionEnds(raw: unknown): LifecycleTransitionEnds | null {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;

  function nullableId(k: "phase" | "step"): string | null {
    if (!Object.prototype.hasOwnProperty.call(o, k)) return null;
    const v = o[k];
    if (v === null || v === undefined) return null;
    if (typeof v === "string") {
      const t = v.trim();
      return t ? t : null;
    }
    return String(v);
  }

  return { phase: nullableId("phase"), step: nullableId("step") };
}

export function describeTransitionEnd(
  end: LifecycleTransitionEnds,
  resolver: LifecycleLabelResolver,
): string {
  if (end.phase == null && end.step == null) return "Not set";
  const p = end.phase ? resolver.phaseTitle(end.phase) : "";
  const s = end.step ? resolver.stepLabel(end.step, end.phase) : "";
  const pOk = p && p !== "—";
  const sOk = s && s !== "—";
  if (pOk && sOk) return `${p} · ${s}`;
  if (sOk) return s;
  if (pOk) return p;
  return "Not set";
}

/** ISO / epoch time on a history row (`at` canonical, else legacy keys). */
export function parseLifecycleHistoryAtMs(raw: Record<string, unknown>): number | null {
  const rawAt = raw.at ?? raw.completedAt ?? raw.lifecycleCompletedAt;
  if (typeof rawAt === "number" && Number.isFinite(rawAt)) return rawAt;
  if (typeof rawAt === "string" && rawAt.trim()) {
    const t = Date.parse(rawAt.trim());
    if (!Number.isNaN(t)) return t;
  }
  return null;
}

/** Which phase contains this step (`stepId` values are unique across phases). */
export function inferPhaseIdFromStepId(
  stepId: string | null | undefined,
): LifecyclePhaseId | undefined {
  if (!stepId) return undefined;
  for (const p of CLIENT_LIFECYCLE_PHASES) {
    if (p.steps.some((s) => s.id === stepId)) return p.id;
  }
  return undefined;
}

/** Step title without knowing phase first (handles sparse history payloads). */
export function getStepLabelGlobal(stepId: string | null | undefined): string {
  if (!stepId) return "—";
  const inferred = inferPhaseIdFromStepId(stepId);
  if (inferred) return getStepLabel(inferred, stepId);
  return stepId;
}

const PHASE_HISTORY_KEYS = [
  "phaseId",
  "lifecyclePhase",
  "lifecycle_phase",
  "phase",
  "currentPhase",
  "current_phase",
  "toPhase",
  "fromPhase",
  "newPhase",
  "previousPhase",
];

const STEP_HISTORY_KEYS = [
  "stepId",
  "lifecycleStep",
  "lifecycle_step",
  "step",
  "currentStep",
  "current_step",
  "toStep",
  "fromStep",
  "newStep",
  "previousStep",
];

const NOTES_HISTORY_KEYS = ["lifecycleNotes", "lifecycle_notes", "notes", "note"];

const TIME_HISTORY_KEYS = [
  "completedAt",
  "lifecycleCompletedAt",
  "lifecycle_completed_at",
  "at",
  "timestamp",
  "updatedAt",
  "createdAt",
  "updated_at",
  "created_at",
];

function pickStringField(r: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = r[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

function pickTimeFromRow(r: Record<string, unknown>): string | undefined {
  for (const k of TIME_HISTORY_KEYS) {
    const v = r[k];
    if (v == null) continue;
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return new Date(v).toISOString();
    if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString();
  }
  return undefined;
}

function normalizeHistoryRow(raw: unknown, depth = 0): Record<string, unknown> | null {
  if (raw == null) return null;
  if (depth > 4) return null;

  if (typeof raw === "string") {
    try {
      const parsed: unknown = JSON.parse(raw);
      return normalizeHistoryRow(parsed, depth + 1);
    } catch {
      return { __rawMessage: raw } as Record<string, unknown>;
    }
  }

  if (typeof raw !== "object") return null;
  if (Array.isArray(raw)) return null;

  return raw as Record<string, unknown>;
}

/** Canonical `{ at, from: {phase,step}, to, notes? }` from `lifecycle.history` on property. */
export function parseCanonicalHistoryEntry(raw: unknown): {
  at: string;
  from: LifecycleTransitionEnds;
  to: LifecycleTransitionEnds;
  notes: string | null;
} | null {
  const base = normalizeHistoryRow(raw);
  if (!base) return null;
  if (typeof base.__rawMessage === "string") return null;

  const endsFrom = coerceTransitionEnds(base.from);
  const endsTo = coerceTransitionEnds(base.to);
  if (
    endsFrom == null ||
    endsTo == null ||
    typeof base.at !== "string" ||
    !String(base.at).trim()
  ) {
    return null;
  }

  let notesVal: string | null = null;
  if ("notes" in base) {
    const n = base.notes;
    if (n === null || n === undefined) notesVal = null;
    else if (typeof n === "string") {
      const t = n.trim();
      notesVal = t ? t : null;
    }
  }

  return {
    at: String(base.at).trim(),
    from: endsFrom,
    to: endsTo,
    notes: notesVal,
  };
}

function unwrapNestedLifecycle(r: Record<string, unknown>): Record<string, unknown> {
  const nestedKeys = [
    "snapshot",
    "data",
    "payload",
    "value",
    "newValue",
    "newValues",
    "to",
    "after",
    "change",
    "details",
    "clientDetails",
    "lifecycle",
  ];

  let current: Record<string, unknown> = r;
  for (let d = 0; d < 3; d++) {
    let found: Record<string, unknown> | null = null;
    for (const k of nestedKeys) {
      const inner = current[k];
      if (inner && typeof inner === "object" && !Array.isArray(inner)) {
        found = inner as Record<string, unknown>;
        break;
      }
    }
    if (!found) break;
    const merged = { ...found, ...current };
    const hasAnyId =
      pickStringField(merged, PHASE_HISTORY_KEYS) || pickStringField(merged, STEP_HISTORY_KEYS);
    if (hasAnyId) return merged;
    current = found;
  }
  return r;
}

function mergeDirectionalSnapshot(r: Record<string, unknown>): Record<string, unknown> {
  const preferNew = ["next", "to", "after", "current", "new"];
  for (const k of preferNew) {
    const v = r[k];
    if (v && typeof v === "object" && !Array.isArray(v)) {
      return { ...(v as Record<string, unknown>), ...r };
    }
  }
  const preferOld = ["previous", "from", "before", "old"];
  for (const k of preferOld) {
    const v = r[k];
    if (v && typeof v === "object" && !Array.isArray(v)) {
      return { ...(v as Record<string, unknown>), ...r };
    }
  }
  return r;
}

/**
 * One plain-text line (e.g. a11y / copy). Prefer **`parseCanonicalHistoryEntry`** + timeline UI when possible.
 */
export function formatLifecycleHistoryRow(
  raw: unknown,
  resolver: LifecycleLabelResolver = createLifecycleLabelResolver(undefined),
): string {
  const canonical = parseCanonicalHistoryEntry(raw);
  if (canonical) {
    const d = new Date(canonical.at);
    const dt = Number.isNaN(d.getTime()) ? canonical.at : d.toLocaleString();
    const fromTxt = describeTransitionEnd(canonical.from, resolver);
    const toTxt = describeTransitionEnd(canonical.to, resolver);
    let s = `${dt} · ${fromTxt} → ${toTxt}`;
    if (canonical.notes) s += ` · "${canonical.notes}"`;
    return s;
  }

  const base = normalizeHistoryRow(raw);
  if (!base) return String(raw);

  if (typeof base.__rawMessage === "string") {
    return base.__rawMessage as string;
  }

  const r = mergeDirectionalSnapshot(unwrapNestedLifecycle(base));

  const stepRaw = pickStringField(r, STEP_HISTORY_KEYS);

  let effectivePhase = pickStringField(r, PHASE_HISTORY_KEYS);
  if (!effectivePhase && stepRaw) {
    effectivePhase = inferPhaseIdFromStepId(stepRaw);
  }

  const notes = pickStringField(r, NOTES_HISTORY_KEYS);
  const whenIso = pickTimeFromRow(r);
  let datePrefix = "";
  if (whenIso) {
    const d = new Date(whenIso);
    if (!Number.isNaN(d.getTime())) datePrefix = `${d.toLocaleString()}: `;
  }

  const phaseLabel = effectivePhase
    ? resolver.phaseTitle(effectivePhase)
    : pickStringField(r, PHASE_HISTORY_KEYS)
      ? resolver.phaseTitle(pickStringField(r, PHASE_HISTORY_KEYS)!)
      : "";

  const stepLabel = stepRaw ? resolver.stepLabel(stepRaw, effectivePhase ?? null) : "";

  let label: string;

  const hasPosition =
    !!stepRaw ||
    !!(effectivePhase && getPhaseDef(effectivePhase)) ||
    !!pickStringField(r, PHASE_HISTORY_KEYS);

  if (hasPosition && phaseLabel && phaseLabel !== "—" && stepLabel && stepLabel !== "—") {
    label = `${phaseLabel} → ${stepLabel}`;
  } else if (hasPosition && stepLabel && stepLabel !== "—") {
    label = stepLabel;
  } else if (hasPosition && phaseLabel && phaseLabel !== "—") {
    label = phaseLabel;
  } else if (notes) {
    label = `Notes — ${notes}`;
  } else {
    const mini = JSON.stringify(r);
    label =
      mini === "{}"
        ? "Lifecycle update"
        : mini.length > 160
          ? `${mini.slice(0, 157)}…`
          : mini;
  }

  const noteSuffix =
    notes && hasPosition && stepLabel && !label.includes(notes) ? ` · "${notes}"` : "";

  return `${datePrefix}${label}${noteSuffix}`;
}
