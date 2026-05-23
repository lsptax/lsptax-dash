import { useState } from "react";
import { ColumnDef, ColumnFiltersState } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import {
  downloadPropertiesCSV,
} from "@/store/data";
import TableBuilder from "../TableBuilder";
import { routes } from "@/routes/ROUTES";
import { Archive, Download, LoaderCircle, Search } from "lucide-react";
import { Properties } from "./columns";
import { Input } from "@/components/ui/input";
import { usePropertiesQuery } from "@/hooks/queries";
import { TableSkeleton } from "../TableSkeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PropertiesTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
}

const PropertiesTable = <TData extends Properties, TValue>({
  columns,
}: PropertiesTableProps<TData, TValue>) => {
  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [archived, setArchived] = useState(false);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [downloadingCsv, setDownloadingCsv] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [accountType, setAccountType] = useState<"all" | "real" | "bpp">("all");

  const commitSearch = () => {
    setAppliedSearch(searchTerm.trim());
    setOffset(0);
  };

  const { data, isLoading, isError, refetch } = usePropertiesQuery({
    limit,
    offset,
    search: appliedSearch,
    archived,
    accountType: accountType === "all" ? undefined : accountType,
  });

  const properties = (data?.data ?? []) as TData[];
  const total = data?.total ?? 0;
  const hasMore = data?.hasMore ?? false;

  const handleCsvDownload = async () => {
    setDownloadingCsv(true);
    try {
      await downloadPropertiesCSV({
        accountType: accountType === "all" ? undefined : accountType,
      });
    } catch (err) {
      console.error("Error downloading CSV:", err);
    } finally {
      setDownloadingCsv(false);
    }
  };

  const switchArchived = () => {
    setArchived((a) => !a);
    setOffset(0);
  };

  if (isLoading) {
    return (
      <>
        <div className="flex flex-col md:flex-row border rounded-xl items-center gap-4 bg-white m-4 p-4">
          <div className="w-full">
            <div className="h-8 w-24 bg-muted animate-pulse rounded" />
            <div className="h-5 w-48 bg-muted animate-pulse rounded mt-2" />
          </div>
          <div className="flex flex-col gap-2 w-full">
            <div className="h-5 w-44 bg-muted animate-pulse rounded" />
            <div className="h-10 max-w-md w-full bg-muted animate-pulse rounded" />
          </div>
          <div className="flex gap-2 w-full">
            <div className="h-10 w-32 bg-muted animate-pulse rounded" />
            <div className="h-10 w-24 bg-muted animate-pulse rounded" />
          </div>
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

  return (
    <div className="overflow-y-auto">
      <div className="flex flex-col md:flex-row border rounded-xl items-center gap-4 bg-white m-4 p-4">
        <div className="w-full">
          <h2 className="text-2xl font-bold">{total}</h2>
          <h3>{archived ? "Archived Properties" : "Active Properties"}</h3>
        </div>
        <div className="flex flex-col gap-2 w-full">
          <h1 className="text-lg font-semibold">Quick Search Properties</h1>
          <div className="flex items-center gap-2 w-full max-w-md">
            <Input
              placeholder="Search by property ID, account number, or client name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitSearch();
                }
              }}
              className="flex-1 min-w-0"
              aria-label="Search properties"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={commitSearch}
              aria-label="Run search"
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex flex-col gap-2 w-full md:max-w-[220px]">
          <h1 className="text-lg font-semibold">Account Type</h1>
          <Select
            value={accountType}
            onValueChange={(v) => {
              setAccountType(v as "all" | "real" | "bpp");
              setOffset(0);
            }}
          >
            <SelectTrigger aria-label="Filter by account type">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="real">Real</SelectItem>
              <SelectItem value="bpp">BPP</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2 w-full">
          <Button onClick={switchArchived}>
            <Archive />
            {archived ? "View Active" : "View Archived"}
          </Button>
          <Button onClick={handleCsvDownload} disabled={downloadingCsv}>
            {downloadingCsv ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <Download />
            )}
          </Button>
        </div>
      </div>
      <TableBuilder
        data={properties}
        columns={columns}
        label={archived ? "Archived Properties" : "All Properties"}
        columnFilters={columnFilters}
        setColumnFilters={setColumnFilters}
        emptyState={
          archived
            ? undefined
            : {
                title: "No properties yet",
                description: "Add a property to start tracking tax and client data.",
                action: { label: "Add your first property", to: routes.properties.add() },
              }
        }
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
      />
    </div>
  );
};

export default PropertiesTable;
