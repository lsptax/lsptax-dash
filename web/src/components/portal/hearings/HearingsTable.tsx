import { useMemo, useState } from "react";
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

const HearingsTable = () => {
  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [appliedFrom, setAppliedFrom] = useState("");
  const [appliedTo, setAppliedTo] = useState("");
  const [appliedStatus, setAppliedStatus] = useState<string>("");

  const applyFilters = () => {
    setAppliedFrom(fromDate.trim());
    setAppliedTo(toDate.trim());
    setAppliedStatus(statusFilter === "all" ? "" : statusFilter);
    setOffset(0);
  };

  const clearFilters = () => {
    setFromDate("");
    setToDate("");
    setStatusFilter("all");
    setAppliedFrom("");
    setAppliedTo("");
    setAppliedStatus("");
    setOffset(0);
  };

  const { data, isLoading, isError, refetch } = useHearingsQuery({
    limit,
    offset,
    from: appliedFrom || undefined,
    to: appliedTo || undefined,
    status: appliedStatus || undefined,
  });

  const hearings = data?.data ?? [];
  const total = data?.total ?? 0;
  const hasMore = data?.hasMore ?? false;

  const columns = useMemo(() => createHearingsColumns(() => void refetch()), [refetch]);

  if (isLoading) {
    return (
      <>
        <div className="flex flex-col gap-3 border rounded-xl bg-white m-4 p-4 md:flex-row md:items-end">
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

  const hasFilters = appliedFrom || appliedTo || appliedStatus;

  return (
    <div>
      <div className="flex flex-col gap-4 border rounded-xl bg-white m-4 p-4 lg:flex-row lg:items-end">
        <div className="flex-1">
          <h2 className="text-2xl font-bold">{total}</h2>
          <h3 className="text-sm text-muted-foreground">Scheduled hearings</h3>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
          <div>
            <label className="text-xs font-medium text-muted-foreground" htmlFor="hearings-from">
              From
            </label>
            <Input
              id="hearings-from"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground" htmlFor="hearings-to">
              To
            </label>
            <Input
              id="hearings-to"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground" htmlFor="hearings-status">
              Status
            </label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger id="hearings-status" className="mt-1 w-[10rem]">
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
          <Button variant="blue" className="gap-2" onClick={applyFilters}>
            <Search className="h-4 w-4" />
            Apply
          </Button>
          {hasFilters && (
            <Button variant="outline" onClick={clearFilters}>
              Clear
            </Button>
          )}
        </div>
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
          onPrev: () => setOffset((o) => Math.max(0, o - limit)),
          onNext: () => setOffset((o) => o + limit),
          onPageSizeChange: (size) => {
            setLimit(size);
            setOffset(0);
          },
        }}
        emptyState={{
          icon: Calendar,
          title: "No hearings found",
          description: hasFilters
            ? "Try adjusting date or status filters."
            : "Hearings appear here once added from a property in Hearing Management.",
        }}
      />
    </div>
  );
};

export default HearingsTable;
