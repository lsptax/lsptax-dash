import { Building2, CornerDownLeft, Home, Search, UserRound, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  searchPortal,
  type PortalSearchItem,
  type PortalSearchResponse,
  type PortalSearchSectionId,
} from "@/api/search";
import { routes } from "@/routes/ROUTES";
import { cn } from "@/lib/utils";

type SectionFilter = "all" | PortalSearchSectionId;

const SECTION_LIST_HREF: Record<PortalSearchSectionId, (query: string) => string | null> = {
  clients: (query) => routes.clients.list({ search: query }),
  properties: (query) => routes.properties.list({ search: query }),
  prospects: () => null,
};

function shouldSearch(value: string) {
  const q = value.trim();
  if (q.length >= 2) return true;
  return /^\d+$/.test(q);
}

function itemHref(sectionId: PortalSearchSectionId, item: PortalSearchItem) {
  if (sectionId === "clients") return routes.client.detail(item.id);
  if (sectionId === "prospects") return routes.prospect.detail(item.id);
  if (item.ownerType === "PROSPECT") return routes.prospect.property(item.id);
  return routes.properties.view(item.id);
}

function SectionIcon({ sectionId }: { sectionId: PortalSearchSectionId }) {
  const className = "h-4 w-4";
  if (sectionId === "properties") return <Home className={className} aria-hidden />;
  if (sectionId === "prospects") return <UserRound className={className} aria-hidden />;
  return <Building2 className={className} aria-hidden />;
}

export function HeaderSearch({ className }: { className?: string }) {
  const navigate = useNavigate();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [result, setResult] = useState<PortalSearchResponse | null>(null);
  const [sectionFilter, setSectionFilter] = useState<SectionFilter>("all");
  const [activeIndex, setActiveIndex] = useState(0);

  const trimmed = query.trim();
  const ready = shouldSearch(query);
  const sections = result?.query === trimmed ? result.sections : [];
  const visibleSections = useMemo(
    () =>
      sectionFilter === "all"
        ? sections
        : sections.filter((section) => section.id === sectionFilter),
    [sectionFilter, sections]
  );
  const flatItems = useMemo(
    () =>
      visibleSections.flatMap((section) =>
        section.items.map((item) => ({
          key: `${section.id}-${item.id}`,
          sectionId: section.id,
          item,
        }))
      ),
    [visibleSections]
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") return;
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "TEXTAREA" || (tag === "INPUT" && event.target !== inputRef.current)) return;
      event.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
      setOpen(true);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    if (!ready) {
      setLoading(false);
      setFailed(false);
      setResult(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setFailed(false);
      try {
        const next = await searchPortal(trimmed, controller.signal);
        setResult(next);
        setSectionFilter("all");
        setActiveIndex(0);
      } catch (error) {
        if (controller.signal.aborted) return;
        setFailed(true);
        setResult(null);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 120);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [ready, trimmed]);

  useEffect(() => {
    if (activeIndex > flatItems.length - 1) setActiveIndex(0);
  }, [activeIndex, flatItems.length]);

  const goToItem = (sectionId: PortalSearchSectionId, item: PortalSearchItem) => {
    setOpen(false);
    setQuery("");
    navigate(itemHref(sectionId, item));
  };

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (!open || !ready) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!flatItems.length) return;
      setActiveIndex((index) => (index + 1) % flatItems.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!flatItems.length) return;
      setActiveIndex((index) => (index - 1 + flatItems.length) % flatItems.length);
      return;
    }
    if (event.key === "Enter") {
      const selected = flatItems[activeIndex] ?? flatItems[0];
      if (!selected) return;
      event.preventDefault();
      goToItem(selected.sectionId, selected.item);
    }
  };

  const shortcut =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)
      ? "⌘K"
      : "Ctrl K";
  const showPanel = open && trimmed.length > 0;
  const activeId = flatItems[activeIndex] ? `${listId}-${flatItems[activeIndex].key}` : undefined;

  return (
    <div ref={rootRef} className={cn("relative min-w-0", className)}>
      <Search
        className="pointer-events-none absolute left-2.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        ref={inputRef}
        type="text"
        value={query}
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-activedescendant={showPanel ? activeId : undefined}
        aria-autocomplete="list"
        aria-label="Search portal"
        autoComplete="off"
        placeholder="Search clients, properties, prospects…"
        className="h-9 bg-muted/50 pl-8 pr-16"
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onInputKeyDown}
      />
      {query ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setQuery("");
            setResult(null);
            inputRef.current?.focus();
          }}
          className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      ) : (
        <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-background px-1.5 py-0.5 font-sans text-[10px] font-medium text-muted-foreground sm:inline">
          {shortcut}
        </kbd>
      )}

      {showPanel ? (
        <div className="absolute right-0 top-[calc(100%+0.375rem)] z-50 w-[min(36rem,calc(100vw-1.5rem))] overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-xl">
          {sections.length > 0 ? (
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <span className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Show
              </span>
              <div className="flex min-w-0 gap-1.5 overflow-x-auto">
                {sections.length > 1 ? (
                  <FilterChip
                    active={sectionFilter === "all"}
                    label={`All (${sections.reduce((sum, section) => sum + section.total, 0)})`}
                    onClick={() => {
                      setSectionFilter("all");
                      setActiveIndex(0);
                    }}
                  />
                ) : null}
                {sections.map((section) => (
                  <FilterChip
                    key={section.id}
                    active={sectionFilter === section.id || sections.length === 1}
                    label={`${section.label} (${section.total})`}
                    onClick={() => {
                      setSectionFilter(section.id);
                      setActiveIndex(0);
                    }}
                  />
                ))}
              </div>
            </div>
          ) : null}

          <div id={listId} role="listbox" aria-label="Search results" className="max-h-[min(28rem,70vh)] overflow-y-auto">
            {!ready ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                Type at least 2 characters
              </p>
            ) : failed ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                Search failed. Try again.
              </p>
            ) : loading && sections.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">Searching…</p>
            ) : sections.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                No matches for “{trimmed}”
              </p>
            ) : (
              visibleSections.map((section) => {
                const listHref = SECTION_LIST_HREF[section.id](trimmed);
                return (
                  <div key={section.id} className="py-1">
                    <p className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {section.label}
                    </p>
                    {section.items.map((item) => {
                      const flatIndex = flatItems.findIndex(
                        (entry) => entry.sectionId === section.id && entry.item === item
                      );
                      const active = flatIndex === activeIndex;
                      const optionId = `${listId}-${section.id}-${item.id}`;
                      return (
                        <button
                          key={`${section.id}-${item.id}-${item.kind}`}
                          id={optionId}
                          type="button"
                          role="option"
                          aria-selected={active}
                          className={cn(
                            "flex w-full items-center gap-3 px-3 py-2 text-left",
                            active
                              ? "border-l-2 border-primary bg-accent"
                              : "border-l-2 border-transparent hover:bg-muted/70"
                          )}
                          onMouseEnter={() => {
                            if (flatIndex >= 0) setActiveIndex(flatIndex);
                          }}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => goToItem(section.id, item)}
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                            <SectionIcon sectionId={section.id} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{item.title}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {item.subtitle}
                            </span>
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground">{item.kind}</span>
                          {active ? (
                            <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                          ) : null}
                        </button>
                      );
                    })}
                    {listHref && section.total > section.items.length ? (
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-xs font-medium text-primary hover:underline"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          setOpen(false);
                          setQuery("");
                          navigate(listHref);
                        }}
                      >
                        View all {section.total} {section.label.toLowerCase()}
                      </button>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium",
        active
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border text-muted-foreground hover:bg-muted"
      )}
    >
      {label}
    </button>
  );
}
