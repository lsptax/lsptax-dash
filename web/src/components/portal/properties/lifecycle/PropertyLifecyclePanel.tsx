import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CLIENT_LIFECYCLE_PHASES,
  createLifecycleLabelResolver,
  describeTransitionEnd,
  formatLifecycleHistoryRow,
  getPhaseTitle,
  getStepLabel,
  parseCanonicalHistoryEntry,
  parseLifecycleHistoryAtMs,
  type LifecyclePhaseDef,
  type LifecyclePhaseId,
} from "@/constants/clientLifecycle";
import type { PropertyLifecyclePayload } from "@/types/clientLifecycle";
import type { Hearing } from "@/types/hearings";
import { PropertyHearingsSection } from "@/components/portal/properties/lifecycle/PropertyHearingsSection";
import { editProperty } from "@/api/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle2, ChevronDown, History, LoaderCircle, Route } from "lucide-react";

type StepVisual = "done" | "current" | "upcoming";

function phaseIndex(phaseId: string | null | undefined): number {
  if (!phaseId) return -1;
  return CLIENT_LIFECYCLE_PHASES.findIndex((p) => p.id === phaseId);
}

function stepVisual(
  phase: LifecyclePhaseDef,
  stepIndex: number,
  currentPhaseId: string | null | undefined,
  currentStepId: string | null | undefined,
): StepVisual {
  const pi = phaseIndex(currentPhaseId);
  const pThis = phaseIndex(phase.id);
  if (pThis < 0 || pi < 0) return "upcoming";
  if (pThis < pi) return "done";
  if (pThis > pi) return "upcoming";

  const curIdx = phase.steps.findIndex((s) => s.id === currentStepId);
  if (curIdx < 0) return "upcoming";
  if (stepIndex < curIdx) return "done";
  if (stepIndex === curIdx) return "current";
  return "upcoming";
}

interface PropertyLifecyclePanelProps {
  propertyId: number | string;
  lifecycle: PropertyLifecyclePayload | null | undefined;
  hearings?: Hearing[];
  onUpdated: () => void | Promise<void>;
}

export function PropertyLifecyclePanel({ propertyId, lifecycle, hearings = [], onUpdated }: PropertyLifecyclePanelProps) {
  const { toast } = useToast();
  /** Collapsible like before; open by default so rail + steps are one click away. */
  const [lifecycleOpen, setLifecycleOpen] = useState(true);
  const [focusedPhaseId, setFocusedPhaseId] = useState<LifecyclePhaseId | null>(
    (lifecycle?.phaseId as LifecyclePhaseId) ?? CLIENT_LIFECYCLE_PHASES[0].id,
  );
  const [notesDraft, setNotesDraft] = useState(lifecycle?.notes ?? "");
  const [saving, setSaving] = useState<string | null>(null);

  const currentPhaseId = lifecycle?.phaseId ?? null;
  const currentStepId = lifecycle?.stepId ?? null;
  const completedAt = lifecycle?.completedAt ?? null;
  const notesDirty = notesDraft !== (lifecycle?.notes ?? "");

  useEffect(() => {
    const pid = lifecycle?.phaseId as LifecyclePhaseId | null | undefined;
    setFocusedPhaseId(pid ?? CLIENT_LIFECYCLE_PHASES[0].id);
    setNotesDraft(lifecycle?.notes ?? "");
  }, [lifecycle?.phaseId, lifecycle?.stepId, lifecycle?.notes, lifecycle?.completedAt]);

  const focusedPhase =
    CLIENT_LIFECYCLE_PHASES.find((p) => p.id === focusedPhaseId) ?? CLIENT_LIFECYCLE_PHASES[0];

  const saveLifecycle = useCallback(
    async (updates: Record<string, unknown>) => {
      try {
        await editProperty(String(propertyId), updates, {});
        toast({
          title: "Lifecycle updated",
          description:
            typeof updates.lifecycleNotes === "string"
              ? "Notes saved."
              : `${getPhaseTitle(String(updates.lifecyclePhase ?? ""))} — ${getStepLabel(String(updates.lifecyclePhase ?? ""), String(updates.lifecycleStep ?? ""))}`,
        });
        await onUpdated();
      } catch {
        toast({
          variant: "destructive",
          title: "Update failed",
          description: "Could not save lifecycle. Try again.",
        });
      } finally {
        setSaving(null);
      }
    },
    [propertyId, onUpdated, toast],
  );

  const onPickStep = (phaseId: LifecyclePhaseId, stepId: string) => {
    if (phaseId === currentPhaseId && stepId === currentStepId) return;
    setSaving(`step:${phaseId}:${stepId}`);
    void saveLifecycle({
      lifecyclePhase: phaseId,
      lifecycleStep: stepId,
    });
  };

  const onSaveNotes = () => {
    setSaving("notes");
    void saveLifecycle({ lifecycleNotes: notesDraft.trim() || "" });
  };

  function isSavingStep(phaseId: LifecyclePhaseId, stepId: string) {
    return saving === `step:${phaseId}:${stepId}`;
  }

  const labelResolver = useMemo(
    () => createLifecycleLabelResolver(lifecycle?.phases),
    [lifecycle?.phases],
  );

  const historyTimeline = useMemo(() => {
    const h = lifecycle?.history;
    if (!Array.isArray(h)) return [];
    type Item = {
      raw: unknown;
      atMs: number;
      isoAt: string;
      canonicalReturn: ReturnType<typeof parseCanonicalHistoryEntry>;
    };
    const items: Item[] = h.map((row) => {
      const record = row as Record<string, unknown>;
      const atMs = parseLifecycleHistoryAtMs(record);
      const atStr =
        typeof record.at === "string" && record.at.trim()
          ? record.at.trim()
          : atMs !== null && Number.isFinite(atMs)
            ? new Date(atMs).toISOString()
            : "";
      return {
        raw: row,
        atMs: atMs ?? Number.POSITIVE_INFINITY,
        isoAt: atStr,
        canonicalReturn: parseCanonicalHistoryEntry(row),
      };
    });
    items.sort((a, b) => {
      const d = a.atMs - b.atMs;
      if (d !== 0) return d;
      return a.isoAt.localeCompare(b.isoAt);
    });
    return items.slice(-40);
  }, [lifecycle?.history]);

  const phaseStrip = CLIENT_LIFECYCLE_PHASES;
  const currentPi = phaseIndex(currentPhaseId);

  return (
    <section className="mt-6">
      <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
        <button
          type="button"
          aria-expanded={lifecycleOpen}
          aria-controls="property-lifecycle-panel"
          onClick={() => setLifecycleOpen((o) => !o)}
          className={cn(
            "flex w-full items-start gap-3 px-3 py-3 text-left sm:gap-3 sm:px-4 sm:py-3.5",
            "hover:bg-slate-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/25 focus-visible:ring-offset-1",
            lifecycleOpen && "border-b border-slate-100",
          )}
        >
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <Route className="h-4 w-4" strokeWidth={2} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="property-lifecycle-heading" className="text-lg font-semibold tracking-tight text-slate-900">
              Property lifecycle
            </h2>
            <p id="property-lifecycle-heading-description" className="mt-0.5 text-xs text-slate-600 sm:text-[13px]">
              Tap a phase below, pick the step — open to edit.
            </p>

            {currentPhaseId && currentStepId ? (
              <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs">
                <span className="font-semibold uppercase tracking-wide text-slate-500">Now</span>
                <span className="font-medium text-slate-900">
                  {labelResolver.stepLabel(currentStepId, currentPhaseId)}
                </span>
                {completedAt ? (
                  <span className="text-slate-500">
                    · <time dateTime={completedAt}>{new Date(completedAt).toLocaleString()}</time>
                  </span>
                ) : null}
              </div>
            ) : currentPhaseId && !currentStepId ? (
              <div className="mt-2">
                <Badge variant="outline" className="border-amber-200/90 bg-amber-50 py-0 text-xs font-normal text-amber-900">
                  Phase set — choose a step when open
                </Badge>
              </div>
            ) : (
              <div className="mt-2">
                <Badge variant="outline" className="border-amber-200/90 bg-amber-50 py-0 text-xs font-normal text-amber-900">
                  Not started — expand to set step
                </Badge>
              </div>
            )}
          </div>
          <ChevronDown
            className={cn("mt-0.5 h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200", lifecycleOpen && "rotate-180")}
            aria-hidden
          />
        </button>

        <div
          id="property-lifecycle-panel"
          role="region"
          aria-labelledby="property-lifecycle-heading"
          aria-describedby="property-lifecycle-heading-description"
          hidden={!lifecycleOpen}
          className={cn(!lifecycleOpen && "hidden")}
        >
          <div className="border-b border-slate-100 bg-slate-50/70 px-2 py-3 sm:px-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:text-[11px]">
              Phases
            </p>
            <div className="overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <ol className="flex min-w-max items-start justify-start gap-0">
                {phaseStrip.map((phase, i) => {
                  const isFocused = phase.id === focusedPhaseId;
                  const isCurrentSlot = i === currentPi;
                  const past = currentPi >= 0 && i < currentPi;

                  return (
                    <li key={phase.id} className="flex items-start">
                      <button
                        type="button"
                        onClick={() => setFocusedPhaseId(phase.id)}
                        title={phase.title}
                        className={cn(
                          "group flex w-[4.25rem] flex-col items-center gap-1 rounded-lg px-0.5 py-1.5 transition-colors sm:w-[4.85rem]",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/30",
                          isFocused ? "bg-white shadow-sm ring-1 ring-slate-200/80" : "hover:bg-white/60",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold tabular-nums",
                            past && "bg-emerald-600 text-white",
                            isCurrentSlot && !past && "bg-indigo-600 text-white ring-2 ring-indigo-100",
                            !past && !isCurrentSlot && currentPi >= 0 && "bg-slate-200 text-slate-700",
                            currentPi < 0 && "bg-slate-200 text-slate-700",
                          )}
                        >
                          {past ? <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.5} /> : phase.order}
                        </span>
                        <span
                          className={cn(
                            "line-clamp-2 text-center text-[10px] font-semibold leading-[1.15] text-slate-600 group-hover:text-slate-900",
                            isFocused && "text-slate-900",
                            isCurrentSlot && "text-indigo-700",
                          )}
                        >
                          {phase.shortTitle}
                        </span>
                      </button>
                      {i < phaseStrip.length - 1 && (
                        <div
                          className="mx-0 mt-[14px] h-1 w-2 shrink-0 rounded-full bg-slate-200 sm:mx-0.5 sm:w-8"
                          aria-hidden
                        >
                          <div className={cn("h-full w-full rounded-full", i < currentPi ? "bg-emerald-500" : "bg-slate-200")} />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            <div className="px-3 py-4 sm:px-5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600">
                Phase {focusedPhase.order} of {CLIENT_LIFECYCLE_PHASES.length}
              </p>
              <h3 className="mt-0.5 text-base font-semibold text-slate-900">{focusedPhase.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">{focusedPhase.summary}</p>

              <ol className="relative mt-4 space-y-0">
                {focusedPhase.steps.map((step, si) => {
                  const vis = stepVisual(focusedPhase, si, currentPhaseId, currentStepId);
                  const isSavingThis = isSavingStep(focusedPhase.id, step.id);
                  const isMarkedCurrent =
                    focusedPhase.id === currentPhaseId && step.id === currentStepId && !!currentStepId;
                  const rowDone = vis === "done";
                  const isLast = si === focusedPhase.steps.length - 1;

                  return (
                    <li key={step.id} className="relative flex gap-0">
                      <div className="flex w-8 shrink-0 flex-col items-center pt-1 sm:w-9" aria-hidden>
                        <div
                          className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-full border-2 text-[10px] font-bold",
                            rowDone && "border-emerald-500 bg-emerald-50 text-emerald-700",
                            isMarkedCurrent && "border-indigo-600 bg-indigo-600 text-white",
                            !rowDone && !isMarkedCurrent && "border-slate-200 bg-white text-slate-400",
                          )}
                        >
                          {rowDone ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" strokeWidth={2.5} /> : si + 1}
                        </div>
                        {!isLast && (
                          <div className={cn("my-0.5 w-px flex-1 min-h-[10px]", rowDone ? "bg-emerald-200" : "bg-slate-200")} />
                        )}
                      </div>

                      <div className={cn("min-w-0 flex-1 pb-4 pl-2 sm:pl-3 sm:pb-5", isLast && "pb-3")}>
                        <div
                          className={cn(
                            "rounded-lg border px-3 py-2.5 sm:flex sm:items-center sm:justify-between sm:gap-3 sm:py-3",
                            isMarkedCurrent && "border-indigo-200/90 bg-indigo-50/50",
                            rowDone && !isMarkedCurrent && "border-slate-100 bg-slate-50/40",
                            !rowDone && !isMarkedCurrent && "border-slate-100 hover:border-slate-200",
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-sm font-semibold text-slate-900">{step.title}</span>
                              {isMarkedCurrent && (
                                <Badge className="h-5 bg-indigo-600 px-1.5 py-0 text-[9px] font-semibold uppercase tracking-wide hover:bg-indigo-600">
                                  Active
                                </Badge>
                              )}
                              {rowDone && !isMarkedCurrent && (
                                <span className="rounded bg-emerald-100 px-1.5 py-0 text-[10px] font-medium text-emerald-800">
                                  Done
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-xs leading-snug text-slate-600">{step.description}</p>
                            {step.id === "calendarIntegration" ? (
                              <PropertyHearingsSection
                                propertyId={propertyId}
                                hearings={hearings}
                                lifecyclePhaseId={currentPhaseId}
                                onUpdated={onUpdated}
                              />
                            ) : null}
                          </div>
                          <div className="mt-2 shrink-0 sm:mt-0">
                            <Button
                              type="button"
                              variant={isMarkedCurrent ? "secondary" : "outline"}
                              size="sm"
                              className={cn(
                                "h-8 w-full text-xs sm:w-auto",
                                isMarkedCurrent && "cursor-default bg-slate-100",
                              )}
                              disabled={(!!saving && !isSavingThis) || isMarkedCurrent}
                              onClick={() => onPickStep(focusedPhase.id, step.id)}
                            >
                              {isSavingThis ? (
                                <span className="inline-flex items-center gap-1.5">
                                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                                  Saving…
                                </span>
                              ) : isMarkedCurrent ? (
                                "Active step"
                              ) : rowDone ? (
                                "Move here"
                              ) : (
                                "Set here"
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="bg-slate-50/50 px-3 py-4 sm:px-5">
              <label htmlFor={`lifecycle-notes-${propertyId}`} className="text-xs font-semibold text-slate-900">
                Notes at this stage
              </label>
              <textarea
                id={`lifecycle-notes-${propertyId}`}
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                rows={3}
                className={cn(
                  "mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900",
                  "placeholder:text-slate-400 focus-visible:border-indigo-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500/20",
                )}
                placeholder="Deadlines, CAD ref, filing method…"
              />
              <div className="mt-2 flex justify-end">
                <Button
                  type="button"
                  variant="blue"
                  size="sm"
                  className="h-8 text-xs"
                  disabled={!notesDirty || !!saving}
                  onClick={onSaveNotes}
                >
                  {saving === "notes" ? (
                    <span className="inline-flex items-center gap-2">
                      <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                      Saving…
                    </span>
                  ) : (
                    "Save notes"
                  )}
                </Button>
              </div>
            </div>

            {historyTimeline.length > 0 && (
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 sm:px-5 marker:content-none [&::-webkit-details-marker]:hidden">
                  <History className="h-3.5 w-3.5 text-slate-500" />
                  History
                  <span className="font-normal text-slate-500">({historyTimeline.length})</span>
                  <ChevronDown className="ml-auto h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
                </summary>
                <div className="border-t border-slate-100 bg-slate-50/40 px-2 py-2 sm:px-4">
                  <ul className="space-y-0">
                    {historyTimeline.map((item, idx) => {
                      const isLatest = idx === historyTimeline.length - 1;
                      const canonical = item.canonicalReturn;
                      const ts = canonical ? new Date(canonical.at) : Number.isFinite(item.atMs) ? new Date(item.atMs) : null;
                      const timeLabel =
                        ts && !Number.isNaN(ts.getTime())
                          ? ts.toLocaleString()
                          : canonical
                            ? canonical.at
                            : item.isoAt || "—";

                      return (
                        <li key={`${idx}-${item.isoAt}`} className={cn("flex gap-2 border-b border-slate-100/80 py-2 last:border-0")}>
                          <div className="flex w-7 shrink-0 flex-col items-center pt-1" aria-hidden>
                            <span
                              className={cn(
                                "h-2 w-2 shrink-0 rounded-full",
                                isLatest ? "bg-indigo-600 ring-4 ring-indigo-100/50" : "bg-slate-300",
                              )}
                            />
                          </div>
                          <div className="min-w-0 pb-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                              <time className="text-[10px] font-semibold uppercase tracking-wide text-slate-500" dateTime={canonical?.at ?? item.isoAt}>
                                {timeLabel}
                              </time>
                              {isLatest ? (
                                <span className="rounded bg-indigo-100 px-1 py-0 text-[9px] font-semibold uppercase text-indigo-800">
                                  Latest
                                </span>
                              ) : null}
                            </div>
                            {canonical ? (
                              <>
                                <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs font-medium leading-snug text-slate-800">
                                  <span>{describeTransitionEnd(canonical.from, labelResolver)}</span>
                                  <ArrowRight className="h-3 w-3 shrink-0 text-slate-400" aria-hidden />
                                  <span>{describeTransitionEnd(canonical.to, labelResolver)}</span>
                                </p>
                                {canonical.notes ? (
                                  <p className="mt-1 rounded border border-slate-100/80 bg-white px-2 py-1 text-xs text-slate-700">
                                    {canonical.notes}
                                  </p>
                                ) : null}
                              </>
                            ) : (
                              <p className="mt-1 text-xs leading-snug text-slate-700">{formatLifecycleHistoryRow(item.raw, labelResolver)}</p>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </details>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
