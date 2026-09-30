import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoaderCircle, X } from "lucide-react";

/** Debounce a list search and report when the typed value is ahead of the loaded results. */
export function useDebouncedListSearch(
  applied: string,
  onCommit: (value: string) => void,
  pending: boolean
) {
  const onCommitRef = useRef(onCommit);
  onCommitRef.current = onCommit;
  const [draft, setDraft] = useState(applied);

  useEffect(() => {
    setDraft((current) => (current.trim() === applied ? current : applied));
  }, [applied]);

  useEffect(() => {
    const next = draft.trim();
    if (next === applied) return;
    const timer = window.setTimeout(() => onCommitRef.current(next), 350);
    return () => window.clearTimeout(timer);
  }, [draft, applied]);

  const commitNow = () => {
    const next = draft.trim();
    if (next !== applied) onCommitRef.current(next);
  };

  return {
    draft,
    setDraft,
    commitNow,
    searching: draft.trim() !== applied || pending,
  };
}

export function ListSearchField({
  label,
  placeholder,
  value,
  onValueChange,
  onCommit,
  searching,
}: {
  label: string;
  placeholder: string;
  value: string;
  onValueChange: (value: string) => void;
  onCommit: () => void;
  searching: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="relative">
        <Input
          aria-label={label}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onCommit();
          }}
          className={`h-9 w-[12rem] ${value || searching ? "pr-8" : ""}`}
        />
        {searching ? (
          <span
            role="status"
            aria-label={`Searching ${label.toLowerCase()}`}
            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
          >
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
          </span>
        ) : value ? (
          <button
            type="button"
            aria-label={`Clear ${label.toLowerCase()} search`}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => onValueChange("")}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
