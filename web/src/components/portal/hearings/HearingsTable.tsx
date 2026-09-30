import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import TableBuilder from "../TableBuilder";
import { createHearingsColumns } from "./columns";
import { useHearingsQuery } from "@/hooks/queries";
import { TableSkeleton } from "../TableSkeleton";
import { HEARING_STATUS_OPTIONS } from "@/constants/hearings";
import { Calendar, Search } from "lucide-react";
import {
  mergeHearingListParams,
  parseHearingListParams,
} from "@/utils/listParams/hearings";
import { useListSearchParams } from "@/hooks/useListSearchParams";
import { ListSearchField, useDebouncedListSearch } from "../ListSearchField";

const HearingsTable = () => {
  const { params, updateParams } = useListSearchParams(
    parseHearingListParams,
    mergeHearingListParams
  );
  const { from, to, status, client, property, offset, limit } = params;
  const [fromDate, setFromDate] = useState(from);
  const [toDate, setToDate] = useState(to);
  const [statusFilter, setStatusFilter] = useState(status || "all");

  useEffect(() => {
    setFromDate(from);
    setToDate(to);
    setStatusFilter(status || "all");
  }, [from, status, to]);

  const applyFilters = () => {
    updateParams({
      from: fromDate.trim(),
      to: toDate.trim(),
      status: statusFilter === "all" ? "" : statusFilter,
      offset: 0,
    });
  };

  const clearFilters = () => {
    setFromDate("");
    setToDate("");
    setStatusFilter("all");
    updateParams({ from: "", to: "", status: "", client: "", property: "", offset: 0 });
  };

  const [loadedClient, setLoadedClient] = useState(client);
  const [loadedProperty, setLoadedProperty] = useState(property);

  const { data, isLoading, isError, isPlaceholderData, refetch } = useHearingsQuery({
    limit,
    offset,
    from: from || undefined,
    to: to || undefined,
    status: status || undefined,
    client,
    property,
  });

  useEffect(() => {
    if (data && !isPlaceholderData) {
      setLoadedClient(client);
      setLoadedProperty(property);
    }
  }, [data, isPlaceholderData, client, property]);

  const clientSearch = useDebouncedListSearch(
    client,
    (next) => updateParams({ client: next, offset: 0 }),
    !isError && loadedClient !== client
  );
  const propertySearch = useDebouncedListSearch(
    property,
    (next) => updateParams({ property: next, offset: 0 }),
    !isError && loadedProperty !== property
  );

  const hearings = data?.data ?? [];
  const total = data?.total ?? 0;
  const hasMore = data?.hasMore ?? false;

  const columns = useMemo(() => createHearingsColumns(() => void refetch()), [refetch]);

  if (isLoading) {
    return (
      <>
        <div className="portal-toolbar md:items-end">
          <div className="h-8 w-32 bg-muted animate-pulse rounded" />
          <div className="h-10 flex-1 bg-muted animate-pulse rounded" />
        </div>
        <TableSkeleton />
      </>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col justify-center items-center py-20 gap-2">
        <Button variant="blue" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const hasFilters = Boolean(from || to || status || client || property);

  return (
    <div>
      <div className="portal-toolbar !flex-wrap md:!items-end">
        <div className="mr-auto shrink-0">
          <p className="text-2xl font-semibold tabular-nums">{total}</p>
          <p className="text-sm text-muted-foreground">Scheduled hearings</p>
        </div>
        <ListSearchField
          label="Client"
          placeholder="Name or #"
          value={clientSearch.draft}
          onValueChange={clientSearch.setDraft}
          onCommit={clientSearch.commitNow}
          searching={clientSearch.searching}
        />
        <ListSearchField
          label="Property"
          placeholder="Property #"
          value={propertySearch.draft}
          onValueChange={propertySearch.setDraft}
          onCommit={propertySearch.commitNow}
          searching={propertySearch.searching}
        />
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground" htmlFor="hearings-from">
            From
          </label>
          <Input
            id="hearings-from"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="h-9 w-[10.5rem]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground" htmlFor="hearings-to">
            To
          </label>
          <Input
            id="hearings-to"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="h-9 w-[10.5rem]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground" htmlFor="hearings-status">
            Status
          </label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger id="hearings-status" className="h-9 w-[10rem]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {HEARING_STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="blue" className="h-9" onClick={applyFilters}>
          <Search />
          Apply
        </Button>
        {hasFilters ? (
          <Button variant="ghost" className="h-9" onClick={clearFilters}>
            Clear
          </Button>
        ) : null}
      </div>

      <TableBuilder
        data={hearings}
        columns={columns}
        label="Hearings"
        serverPagination={{
          total,
          limit,
          offset,
          hasMore,
          onPrev: () => updateParams({ offset: Math.max(0, offset - limit) }),
          onNext: () => updateParams({ offset: offset + limit }),
          onPageSizeChange: (size) => {
            updateParams({ limit: size, offset: 0 });
          },
        }}
        emptyState={{
          icon: Calendar,
          title: "No hearings found",
          description: hasFilters
            ? "Try adjusting the filters."
            : "Hearings appear here once added from a property in Hearing Management.",
        }}
      />
    </div>
  );
};

export default HearingsTable;
