import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

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
import { getOwnerDashboardOptions } from "@/api/ownerDashboard";
import { getClients } from "@/store/clients";
import { getProperties } from "@/store/properties";
import type { OwnerFilters } from "@/utils/ownerFilters";
import { emptyOwnerFilters } from "@/utils/ownerFilters";
import type { Clients } from "@/components/portal/clients/list/columns";
import type { Properties } from "@/components/portal/properties/columns";

const ALL = "__all__";

type OwnerFiltersBarProps = {
  value: OwnerFilters;
  onChange: (next: OwnerFilters) => void;
};

function patch(value: OwnerFilters, key: keyof OwnerFilters, next: string): OwnerFilters {
  const copy = { ...value };
  if (!next) delete copy[key];
  else copy[key] = next;
  return copy;
}

export default function OwnerFiltersBar({ value, onChange }: OwnerFiltersBarProps) {
  const optionsQuery = useQuery({
    queryKey: ["owner-dashboard-options"],
    queryFn: getOwnerDashboardOptions,
    staleTime: 5 * 60 * 1000,
  });

  const years = useMemo(() => {
    const fromApi = optionsQuery.data?.taxYears ?? [];
    const current = new Date().getFullYear();
    const set = new Set<number>([...fromApi, current, current - 1]);
    return [...set].sort((a, b) => b - a);
  }, [optionsQuery.data?.taxYears]);

  const counties = optionsQuery.data?.counties ?? [];

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-gray-900">Filters</div>
          <p className="text-xs text-muted-foreground">
            Billed uses invoice date. Collected uses paid date. Tax year is the protest year.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange(emptyOwnerFilters())}
        >
          Clear
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
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
        <Field label="Month">
          <Input
            type="month"
            value={value.month ?? ""}
            onChange={(e) => onChange(patch(value, "month", e.target.value))}
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
              <SelectValue placeholder="All years" />
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
        <Field label="Tax year">
          <Select
            value={value.taxYear ?? ALL}
            onValueChange={(next) =>
              onChange(patch(value, "taxYear", next === ALL ? "" : next))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All tax years" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All</SelectItem>
              {years.map((year) => (
                <SelectItem key={`tax-${year}`} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="County">
          <Select
            value={value.county ?? ALL}
            onValueChange={(next) =>
              onChange(patch(value, "county", next === ALL ? "" : next))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="All counties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All</SelectItem>
              {counties.map((county) => (
                <SelectItem key={county} value={county}>
                  {county}
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
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
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
          <div className="absolute z-20 mt-1 w-full rounded-md border bg-white shadow max-h-48 overflow-auto">
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
