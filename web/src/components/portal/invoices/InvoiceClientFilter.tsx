import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { getClients } from "@/store/clients";
import { formatClientNumberDisplay } from "@/utils/clientContact";
import { cn } from "@/lib/utils";
export type InvoiceClientOption = {
  id: number;
  clientNumber: string;
  clientName: string;
};

function toClientOption(row: unknown): InvoiceClientOption | null {
  if (!row || typeof row !== "object") return null;
  const record = row as {
    clientId?: unknown;
    clientNumber?: unknown;
    clientName?: unknown;
  };
  const id = Number(record.clientId);
  if (!Number.isInteger(id) || id <= 0) return null;
  return {
    id,
    clientNumber: record.clientNumber == null ? "" : String(record.clientNumber).trim(),
    clientName: record.clientName == null ? "" : String(record.clientName).trim(),
  };
}

export function clientOptionLabel(option: InvoiceClientOption): string {
  const number = formatClientNumberDisplay(option.clientNumber);
  const name = option.clientName || "Unnamed";
  return number === "—" ? name : `${name} (${number})`;
}

export function clientFilterValue(option: InvoiceClientOption): string {
  return option.clientNumber ? `#${option.clientNumber}` : option.clientName;
}

/** One client when the term is an exact number, an exact name, or the only match. */
export function matchSingleClient(
  rows: InvoiceClientOption[],
  total: number,
  term: string
): InvoiceClientOption | null {
  const raw = term.trim();
  const number = raw.startsWith("#") ? raw.slice(1).trim() : raw;
  if (/^\d+$/.test(number)) {
    const matches = rows.filter((row) => row.clientNumber === number);
    return matches.length === 1 ? matches[0] : null;
  }
  const byName = rows.filter((row) => row.clientName.toLowerCase() === raw.toLowerCase());
  if (byName.length === 1) return byName[0];
  if (rows.length === 1 && total === 1) return rows[0];
  return null;
}

function canSearch(term: string): boolean {
  const trimmed = term.trim();
  return trimmed.length > 0 && trimmed !== "#";
}

export function InvoiceClientFilter({
  client,
  clientId,
  onSelect,
  onClear,
}: {
  client: string;
  clientId: number | null;
  onSelect: (client: InvoiceClientOption) => void;
  onClear: () => void;
}) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const labeledIdRef = useRef<number | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(draft.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [draft]);

  useEffect(() => {
    setActive(0);
  }, [debounced]);

  useEffect(() => {
    const term = client.trim();
    if (!term) {
      if (clientId == null) {
        labeledIdRef.current = null;
        setLabel(null);
      }
      return;
    }
    if (clientId != null && labeledIdRef.current === clientId) return;

    let cancelled = false;
    void (async () => {
      try {
        const res = await getClients(20, 0, term);
        if (cancelled) return;
        const rows = (res.data as unknown[])
          .map(toClientOption)
          .filter((row): row is InvoiceClientOption => row != null);
        const match =
          (clientId != null ? rows.find((row) => row.id === clientId) : null) ??
          (clientId == null ? matchSingleClient(rows, res.total, term) : null);
        if (!match) return;
        labeledIdRef.current = match.id;
        setLabel(clientOptionLabel(match));
        if (clientId !== match.id || client !== clientFilterValue(match)) {
          onSelectRef.current(match);
        }
      } catch {
        // The field still shows the current filter text if lookup fails.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [client, clientId]);

  const searchReady = open && canSearch(debounced) && debounced === draft.trim();
  const search = useQuery({
    queryKey: ["invoice-client-search", debounced],
    queryFn: async () => {
      const res = await getClients(20, 0, debounced);
      return (res.data as unknown[])
        .map(toClientOption)
        .filter((row): row is InvoiceClientOption => row != null);
    },
    enabled: searchReady,
  });

  const options = searchReady ? (search.data ?? []) : [];
  const searching = canSearch(draft) && (!searchReady || search.isFetching);
  const shownValue = open ? draft : (label ?? client);
  const showClear = draft.length > 0 || Boolean(client) || clientId != null;

  const choose = (option: InvoiceClientOption) => {
    labeledIdRef.current = option.id;
    setLabel(clientOptionLabel(option));
    setDraft("");
    setOpen(false);
    onSelect(option);
  };

  const clearAll = () => {
    labeledIdRef.current = null;
    setLabel(null);
    setDraft("");
    setOpen(false);
    onClear();
  };

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground">Client</span>
      <div className="flex items-center gap-1.5">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverAnchor asChild>
            <div className="relative" ref={anchorRef}>
              <Input
                aria-label="Client"
                aria-expanded={open}
                aria-autocomplete="list"
                role="combobox"
                placeholder="Search name or #"
                value={shownValue}
                onFocus={() => {
                  setDraft((current) => (open ? current : clientId == null ? client : ""));
                  setOpen(true);
                }}
                onChange={(event) => {
                  setDraft(event.target.value);
                  setOpen(true);
                }}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setOpen(true);
                    setActive((index) => Math.min(index + 1, Math.max(options.length - 1, 0)));
                  } else if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setActive((index) => Math.max(index - 1, 0));
                  } else if (event.key === "Enter") {
                    const option = options[active] ?? options[0];
                    if (open && option) {
                      event.preventDefault();
                      choose(option);
                    }
                  } else if (event.key === "Escape") {
                    setOpen(false);
                  }
                }}
                className={cn("h-9 w-[16rem]", showClear ? "pr-8" : "")}
              />
              {showClear ? (
                <button
                  type="button"
                  aria-label="Clear client"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    if (!client && clientId == null) {
                      setDraft("");
                      return;
                    }
                    clearAll();
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          </PopoverAnchor>
          <PopoverContent
            align="start"
            className="w-[22rem] p-1"
            onOpenAutoFocus={(event) => event.preventDefault()}
            onCloseAutoFocus={(event) => event.preventDefault()}
            onInteractOutside={(event) => {
              if (anchorRef.current?.contains(event.target as Node)) {
                event.preventDefault();
              }
            }}
          >
            <div role="listbox" aria-label="Clients" className="max-h-60 overflow-auto">
              {!canSearch(draft) ? (
                <p className="px-2 py-3 text-center text-sm text-muted-foreground">
                  Type a name or client number
                </p>
              ) : searching ? (
                <p className="px-2 py-3 text-center text-sm text-muted-foreground">Searching…</p>
              ) : search.isError ? (
                <p className="px-2 py-3 text-center text-sm text-muted-foreground">
                  Could not search clients
                </p>
              ) : options.length === 0 ? (
                <p className="px-2 py-3 text-center text-sm text-muted-foreground">No clients found</p>
              ) : (
                options.map((option, index) => (
                  <button
                    type="button"
                    role="option"
                    aria-selected={option.id === clientId}
                    key={option.id}
                    className={cn(
                      "block w-full rounded-sm px-2 py-1.5 text-left text-sm",
                      index === active ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                    )}
                    onMouseEnter={() => setActive(index)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => choose(option)}
                  >
                    {clientOptionLabel(option)}
                  </button>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
