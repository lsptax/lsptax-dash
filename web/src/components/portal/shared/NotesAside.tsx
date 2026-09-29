import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { RecordNotesCard } from "./RecordNotesCard";

export function useNotesPanel(storageKey: string) {
  const [open, setOpenState] = useState(() => localStorage.getItem(storageKey) === "1");

  const setOpen = (next: boolean) => {
    setOpenState(next);
    localStorage.setItem(storageKey, next ? "1" : "0");
  };

  return { open, setOpen };
}

export function notesPanelClass(open: boolean) {
  return cn(
    "flex flex-col lg:grid lg:items-start lg:gap-x-4",
    open
      ? "lg:grid-cols-[minmax(0,1.35fr)_minmax(16rem,0.85fr)]"
      : "lg:grid-cols-[minmax(0,1fr)_2.75rem]"
  );
}

export function NotesAside({
  open,
  onOpenChange,
  description,
  value,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  description: string;
  value: string;
  onSave: (notes: string) => Promise<void>;
}) {
  return (
    <div className="order-2 mt-8 lg:order-none lg:mt-0">
      {open ? (
        <RecordNotesCard
          compact
          title="Notes"
          description={description}
          value={value}
          headerAction={
            <button
              type="button"
              aria-label="Collapse notes"
              title="Collapse"
              onClick={() => onOpenChange(false)}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground [&_svg]:size-4"
            >
              <ChevronRight />
            </button>
          }
          onSave={onSave}
        />
      ) : (
        <button
          type="button"
          aria-label="Expand notes"
          onClick={() => onOpenChange(true)}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-semibold lg:sticky lg:top-4 lg:h-auto lg:min-h-40 lg:w-11 lg:flex-col lg:gap-3 lg:py-4"
        >
          <ChevronLeft className="size-4 shrink-0" />
          <span className="lg:rotate-180 lg:[writing-mode:vertical-rl]">Notes</span>
        </button>
      )}
    </div>
  );
}
