import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, ChevronUp, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getOwnerDashboardOptions } from "@/api/ownerDashboard";
import { getClients } from "@/store/clients";
import { getProperties } from "@/store/properties";
import { currentOwnerMonth, emptyOwnerFilters, type OwnerFilters } from "@/utils/ownerFilters";
import type { Clients } from "@/components/portal/clients/list/columns";
import type { Properties } from "@/components/portal/properties/columns";

const ALL = "__all__";
const ADVANCED_KEYS: (keyof OwnerFilters)[] = [
  "from",
  "to",
  "calendarYear",
  "clientId",
  "propertyId",
];

type OwnerFiltersBarProps = {
  value: OwnerFilters;
  onChange: (next: OwnerFilters) => void;
  actions?: ReactNode;
};

type FilterOption = { value: string; label: string };

function patch(
  value: OwnerFilters,
  key: "from" | "to" | "calendarYear" | "clientId" | "propertyId",
  next: string
): OwnerFilters {
  const copy = { ...value };
  if (!next) delete copy[key];
  else copy[key] = next;
  return copy;
}

function patchList(
  value: OwnerFilters,
  key: "month" | "taxYear" | "county",
  next: string[]
): OwnerFilters {
  const copy = { ...value };
  if (!next.length) delete copy[key];
  else copy[key] = next;
  return copy;
}

function hasAdvanced(value: OwnerFilters) {
  return ADVANCED_KEYS.some((key) => Boolean(value[key]));
}

function monthOptions(): FilterOption[] {
  const [year, month] = currentOwnerMonth().split("-").map(Number);
  const out: FilterOption[] = [];
  for (let i = 0; i < 36; i += 1) {
    const date = new Date(year, month - 1 - i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    out.push({
      value,
      label: date.toLocaleString("en-US", { month: "short", year: "numeric" }),
    });
  }
  return out;
}

function formatMonthLabel(value: string) {
  const [year, month] = value.split("-").map(Number);
  if (!year || !month) return value;
  return new Date(year, month - 1, 1).toLocaleString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export default function OwnerFiltersBar({ value, onChange, actions }: OwnerFiltersBarProps) {
  const [more, setMore] = useState(() => hasAdvanced(value));
  const optionsQuery = useQuery({
    queryKey: ["owner-dashboard-options"],
    queryFn: getOwnerDashboardOptions,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (hasAdvanced(value)) setMore(true);
  }, [value]);

  const years = useMemo(() => {
    const fromApi = optionsQuery.data?.taxYears ?? [];
    const current = new Date().getFullYear();
    const set = new Set<number>([...fromApi, current, current - 1]);
    return [...set].sort((a, b) => b - a);
  }, [optionsQuery.data?.taxYears]);

  const counties = optionsQuery.data?.counties ?? [];
  const months = useMemo(() => monthOptions(), []);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start gap-3">
        <Field label="Month" className="min-w-[16rem] flex-[1_1_16rem]">
          <FilterMultiSelect
            values={value.month ?? []}
            options={months}
            searchable
            allTimeLabel="All-time"
            emptyLabel="No month found"
            onChange={(next) => onChange(patchList(value, "month", next))}
          />
        </Field>
        <Field label="Tax year" className="min-w-[14rem] flex-[1_1_14rem]">
          <FilterMultiSelect
            values={value.taxYear ?? []}
            options={years.map((year) => ({ value: String(year), label: String(year) }))}
            searchable
            allTimeLabel="All-time"
            emptyLabel="No year found"
            onChange={(next) => onChange(patchList(value, "taxYear", next))}
          />
        </Field>
        <Field label="County" className="min-w-[16rem] flex-[1_1_16rem]">
          <FilterMultiSelect
            values={value.county ?? []}
            options={counties.map((county) => ({ value: county, label: county }))}
            searchable
            allTimeLabel="All-time"
            emptyLabel="No county found"
            onChange={(next) => onChange(patchList(value, "county", next))}
          />
        </Field>
        <div className="flex flex-wrap items-center gap-2 pt-5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1"
            onClick={() => setMore((open) => !open)}
          >
            {more ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            More
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(emptyOwnerFilters())}
          >
            Clear
          </Button>
          {actions ? <div className="flex flex-wrap items-center gap-2 sm:ml-auto">{actions}</div> : null}
        </div>
      </div>

      {more ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
          <Field label="From">
            <Input
              type="date"
              value={value.from ?? ""}
              onChange={(e) => onChange(patch(value, "from", e.target.value))}
            />
          </Field>
          <Field label="To">
            <Input
              type="date"
              value={value.to ?? ""}
              onChange={(e) => onChange(patch(value, "to", e.target.value))}
            />
          </Field>
          <Field label="Calendar year">
            <Select
              value={value.calendarYear ?? ALL}
              onValueChange={(next) =>
                onChange(patch(value, "calendarYear", next === ALL ? "" : next))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All</SelectItem>
                {years.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <EntitySearch
            label="Client"
            value={value.clientId ?? ""}
            displayKind="client"
            onChange={(id) => onChange(patch(value, "clientId", id))}
          />
          <EntitySearch
            label="Property"
            value={value.propertyId ?? ""}
            displayKind="property"
            onChange={(id) => onChange(patch(value, "propertyId", id))}
          />
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

const ALL_TIME_VALUE = "__all_time__";

function FilterMultiSelect({
  values,
  options,
  onChange,
  searchable = false,
  emptyLabel,
  allTimeLabel,
}: {
  values: string[];
  options: FilterOption[];
  onChange: (next: string[]) => void;
  searchable?: boolean;
  emptyLabel: string;
  allTimeLabel?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const labels = useMemo(() => {
    const map = new Map(options.map((option) => [option.value, option.label]));
    for (const value of values) {
      if (!map.has(value)) {
        map.set(value, value.includes("-") && value.length === 7 ? formatMonthLabel(value) : value);
      }
    }
    return map;
  }, [options, values]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const extra = values
      .filter((value) => !options.some((option) => option.value === value))
      .map((value) => ({ value, label: labels.get(value) ?? value }));
    const allTime =
      allTimeLabel && (!q || allTimeLabel.toLowerCase().includes(q))
        ? [{ value: ALL_TIME_VALUE, label: allTimeLabel }]
        : [];
    const list = [...allTime, ...extra, ...options];
    if (!q) return list;
    return list.filter(
      (option) =>
        option.value === ALL_TIME_VALUE ||
        option.label.toLowerCase().includes(q) ||
        option.value.toLowerCase().includes(q)
    );
  }, [allTimeLabel, labels, options, query, values]);

  useEffect(() => {
    setActive(0);
  }, [query, open]);

  useEffect(() => {
    if (!open) return;
    function onDoc(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function toggle(value: string) {
    if (value === ALL_TIME_VALUE) {
      onChange([]);
    } else {
      onChange(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
    }
    setQuery("");
    inputRef.current?.focus();
  }

  function remove(value: string) {
    onChange(values.filter((item) => item !== value));
  }

  return (
    <div ref={rootRef} className="relative">
      <div
        className={cn(
          "flex min-h-9 w-full flex-wrap items-center gap-1 rounded-md border border-input bg-transparent px-1.5 py-1 shadow-sm",
          "focus-within:ring-1 focus-within:ring-ring"
        )}
        onClick={() => {
          setOpen(true);
          inputRef.current?.focus();
        }}
      >
        {values.length === 0 && allTimeLabel ? (
          <span className="inline-flex items-center rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground">
            {allTimeLabel}
          </span>
        ) : (
          values.map((value) => (
            <span
              key={value}
              className="inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-muted/70 px-2 py-0.5 text-xs"
            >
              <span className="truncate">{labels.get(value) ?? value}</span>
              <button
                type="button"
                aria-label={`Remove ${labels.get(value) ?? value}`}
                className="rounded-full p-0.5 text-muted-foreground hover:bg-background hover:text-foreground"
                onMouseDown={(event) => event.preventDefault()}
                onClick={(event) => {
                  event.stopPropagation();
                  remove(value);
                }}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))
        )}
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          autoComplete="off"
          value={query}
          placeholder="Add…"
          readOnly={!searchable && !open}
          className="h-7 min-w-[5rem] flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground"
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Backspace" && !query && values.length) {
              event.preventDefault();
              remove(values[values.length - 1]);
              return;
            }
            if (event.key === "Escape") {
              setOpen(false);
              setQuery("");
              return;
            }
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              setActive((index) => Math.min(index + 1, Math.max(filtered.length - 1, 0)));
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((index) => Math.max(index - 1, 0));
            }
            if (event.key === "Enter" && open && filtered[active]) {
              event.preventDefault();
              toggle(filtered[active].value);
            }
          }}
        />
        <ChevronDown className="mr-1 h-4 w-4 shrink-0 opacity-50" />
      </div>
      {open ? (
        <div
          role="listbox"
          className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
        >
          <div className="max-h-60 overflow-auto p-1">
            {filtered.length === 0 ? (
              <div className="px-2 py-3 text-center text-sm text-muted-foreground">{emptyLabel}</div>
            ) : (
              filtered.map((option, index) => {
                const isAllTime = option.value === ALL_TIME_VALUE;
                const selected = isAllTime ? values.length === 0 : values.includes(option.value);
                return (
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    key={option.value}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm",
                      isAllTime && "border-b border-border mb-1",
                      index === active ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                    )}
                    onMouseEnter={() => setActive(index)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => toggle(option.value)}
                  >
                    <Check className={cn("h-3.5 w-3.5", selected ? "opacity-100" : "opacity-0")} />
                    {option.label}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function EntitySearch({
  label,
  value,
  displayKind,
  onChange,
}: {
  label: string;
  value: string;
  displayKind: "client" | "property";
  onChange: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!value) setQuery("");
  }, [value]);

  const searchQuery = useQuery({
    queryKey: ["owner-filter-search", displayKind, query],
    queryFn: async () => {
      if (displayKind === "client") {
        const res = await getClients(20, 0, query);
        return (res.data as Clients[]).map((row) => ({
          id: String(row.clientId),
          label: `${row.clientName || "Unnamed"} (#${row.clientNumber || row.clientId})`,
        }));
      }
      const res = await getProperties(20, 0, query);
      return (res.data as Properties[]).map((row) => ({
        id: String(row.propertyId),
        label: `${row.propertyAccount || row.propertyId} · ${row.cadOwner?.name || "Property"}`,
      }));
    },
    enabled: open && query.trim().length >= 2,
    staleTime: 30 * 1000,
  });

  const options = searchQuery.data ?? [];

  return (
    <Field label={label}>
      <div className="relative">
        <Input
          value={query || (value ? `ID ${value}` : "")}
          placeholder={`Search ${label.toLowerCase()}…`}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (!e.target.value) onChange("");
          }}
        />
        {value ? (
          <button
            type="button"
            className="absolute right-2 top-1.5 text-xs text-muted-foreground"
            onClick={() => {
              onChange("");
              setQuery("");
            }}
          >
            Clear
          </button>
        ) : null}
        {open && query.trim().length >= 2 ? (
          <div className="absolute z-20 mt-1 w-full rounded-md border bg-card shadow max-h-48 overflow-auto">
            {searchQuery.isLoading ? (
              <div className="p-2 text-xs text-muted-foreground">Searching…</div>
            ) : options.length === 0 ? (
              <div className="p-2 text-xs text-muted-foreground">No matches</div>
            ) : (
              options.map((option) => (
                <button
                  type="button"
                  key={option.id}
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-muted"
                  onClick={() => {
                    onChange(option.id);
                    setQuery(option.label);
                    setOpen(false);
                  }}
                >
                  {option.label}
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>
    </Field>
  );
}
