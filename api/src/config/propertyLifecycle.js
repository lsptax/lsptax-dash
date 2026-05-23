/**
 * Phase 1 lifecycle resolution & API shape.
 * Canonical phase/step ids live in `lifecycleConstants.js`.
 * Lifecycle is tracked per-property (each property has its own protest cycle).
 */

import {
  LIFECYCLE_PHASES,
  LIFECYCLE_PHASE_IDS,
  LIFECYCLE_STEP_IDS,
  LEGACY_LIFECYCLE_PHASE_ENUM_TO_ID,
} from "./lifecycleConstants.js";

export {
  LIFECYCLE_PHASES,
  LIFECYCLE_PHASE_IDS,
  LIFECYCLE_STEP_IDS,
} from "./lifecycleConstants.js";

export function phaseIdForStep(stepId) {
  if (!stepId || !LIFECYCLE_STEP_IDS.has(stepId)) return null;
  for (const p of LIFECYCLE_PHASES) {
    if (p.steps.some((s) => s.stepId === stepId)) return p.phaseId;
  }
  return null;
}

export function stepBelongsToPhase(stepId, phaseId) {
  if (!stepId || phaseId == null || phaseId === "") return false;
  if (!LIFECYCLE_PHASE_IDS.has(phaseId)) return false;
  const def = LIFECYCLE_PHASES.find((p) => p.phaseId === phaseId);
  return def?.steps.some((s) => s.stepId === stepId) ?? false;
}

/** Normalize stored or API input to a valid `phaseId`, or null. */
export function parseLifecyclePhaseInput(raw) {
  if (raw == null || raw === "") return null;
  if (typeof raw !== "string") return null;
  if (LIFECYCLE_PHASE_IDS.has(raw)) return raw;
  const legacy = LEGACY_LIFECYCLE_PHASE_ENUM_TO_ID[raw];
  if (legacy && LIFECYCLE_PHASE_IDS.has(legacy)) return legacy;
  return null;
}

function normalizeHistoryArray(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw;
  return [];
}

export function appendLifecycleHistory(existingHistory, entry) {
  const arr = normalizeHistoryArray(existingHistory);
  return [...arr, entry];
}

/**
 * Build `lifecycle` object for GET /api/property (includes reference `phases` for UI).
 * `completedAt` / `notes` match API naming; DB columns are lifecycleCompletedAt / lifecycleNotes.
 */
export function buildLifecycleResponse(property) {
  const phases = LIFECYCLE_PHASES;
  return {
    phaseId: property.lifecyclePhase ?? null,
    stepId: property.lifecycleStep ?? null,
    completedAt:
      property.lifecycleCompletedAt instanceof Date
        ? property.lifecycleCompletedAt.toISOString()
        : property.lifecycleCompletedAt ?? null,
    notes: property.lifecycleNotes ?? null,
    history: normalizeHistoryArray(property.lifecycleHistory),
    phases,
  };
}

export const LIFECYCLE_PATCH_FIELDS = [
  "lifecyclePhase",
  "lifecycleStep",
  "lifecycleNotes",
];

export function resolveLifecycleUpdate(existing, patch) {
  const exPhase = existing.lifecyclePhase ?? null;
  const exStep = existing.lifecycleStep ?? null;
  const exNotes = existing.lifecycleNotes ?? null;

  const phasePatched = Object.prototype.hasOwnProperty.call(patch, "lifecyclePhase");
  const stepPatched = Object.prototype.hasOwnProperty.call(patch, "lifecycleStep");

  let nextPhase = exPhase;
  if (phasePatched) {
    const raw = patch.lifecyclePhase;
    if (raw != null && raw !== "") {
      const p = parseLifecyclePhaseInput(raw);
      if (p == null) {
        return { data: null, error: "Invalid lifecyclePhase" };
      }
      nextPhase = p;
    } else {
      nextPhase = null;
    }
  }

  let nextStep = Object.prototype.hasOwnProperty.call(patch, "lifecycleStep")
    ? patch.lifecycleStep
    : exStep;
  const nextNotes = Object.prototype.hasOwnProperty.call(patch, "lifecycleNotes")
    ? patch.lifecycleNotes
    : exNotes;

  if (nextStep != null && nextStep !== "") {
    if (!LIFECYCLE_STEP_IDS.has(nextStep)) {
      return { data: null, error: `Invalid lifecycleStep: ${nextStep}` };
    }
  } else {
    nextStep = null;
  }

  if (stepPatched && !phasePatched) {
    const inferred = phaseIdForStep(nextStep);
    if (inferred) nextPhase = inferred;
    else if (nextStep) {
      return { data: null, error: "Invalid lifecycleStep" };
    }
  }

  if (phasePatched && !stepPatched && nextStep != null && exPhase !== nextPhase) {
    if (!stepBelongsToPhase(nextStep, nextPhase)) {
      nextStep = null;
    }
  }

  if (nextStep != null && nextPhase != null && !stepBelongsToPhase(nextStep, nextPhase)) {
    return {
      data: null,
      error: "lifecycleStep does not belong to lifecyclePhase",
    };
  }

  const historyArr = normalizeHistoryArray(existing.lifecycleHistory);
  const changed =
    exPhase !== nextPhase ||
    exStep !== nextStep ||
    (exNotes ?? null) !== (nextNotes ?? null);

  if (!changed) {
    return { data: {} };
  }

  const now = new Date();
  return {
    data: {
      lifecyclePhase: nextPhase,
      lifecycleStep: nextStep,
      lifecycleNotes: nextNotes,
      lifecycleCompletedAt: now,
      lifecycleHistory: appendLifecycleHistory(historyArr, {
        at: now.toISOString(),
        from: {
          phase: exPhase,
          step: exStep,
        },
        to: {
          phase: nextPhase,
          step: nextStep,
        },
        notes: nextNotes ?? null,
      }),
    },
  };
}
