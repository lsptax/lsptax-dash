import { useState } from "react";
import { ColumnDef, ColumnFiltersState } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { downloadPropertiesXlsx } from "@/store/data";
import TableBuilder from "../TableBuilder";
import { routes } from "@/routes/ROUTES";
import { Archive, Download, LoaderCircle } from "lucide-react";
import { Properties } from "./columns";
import { usePropertiesQuery } from "@/hooks/queries";
import { TableSkeleton } from "../TableSkeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  mergePropertyListParams,
  parsePropertyListParams,
  type AccountTypeFilter,
} from "@/utils/listParams/properties";
import { useListSearchParams } from "@/hooks/useListSearchParams";
import { useToast } from "@/hooks/use-toast";

interface PropertiesTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
}

const PropertiesTable = <TData extends Properties, TValue>({
  columns,
}: PropertiesTableProps<TData, TValue>) => {
  const { toast } = useToast();
  const { params, updateParams } = useListSearchParams(
    parsePropertyListParams,
    mergePropertyListParams
  );
  const { search, accountType, offset, limit, archived } = params;
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [downloadingCsv, setDownloadingCsv] = useState(false);

  const { data, isLoading, isError, refetch } = usePropertiesQuery({
    limit,
    offset,
    search,
    archived,
    accountType: accountType === "all" ? undefined : accountType,
  });

  const properties = (data?.data ?? []) as TData[];
  const total = data?.total ?? 0;
  const hasMore = data?.hasMore ?? false;

  const handleCsvDownload = async () => {
    setDownloadingCsv(true);
    try {
      await downloadPropertiesXlsx({
        accountType: accountType === "all" ? undefined : accountType,
      });
    } catch (err) {
      console.error("Error downloading properties export:", err);
      toast({
        title: "Export failed",
        description: err instanceof Error ? err.message : "Could not download properties.",
        variant: "destructive",
      });
    } finally {
      setDownloadingCsv(false);
    }
  };

  const switchArchived = () => {
    updateParams({ archived: !archived, offset: 0 });
  };

  if (isLoading) {
    return (
      <>
        <div className="portal-toolbar">
          <div className="w-full">
            <div className="h-8 w-24 bg-muted animate-pulse rounded" />
            <div className="h-5 w-48 bg-muted animate-pulse rounded mt-2" />
          </div>
          <div className="flex flex-col gap-2 w-full md:max-w-[220px]">
            <div className="h-5 w-28 bg-muted animate-pulse rounded" />
            <div className="h-10 w-full bg-muted animate-pulse rounded" />
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
      <div className="portal-toolbar">
        <div className="w-full">
          <p className="text-2xl font-semibold tabular-nums">{total}</p>
          <p className="text-sm text-muted-foreground">{archived ? "Archived properties" : "Active properties"}</p>
        </div>
        <div className="flex flex-col gap-2 w-full md:max-w-[220px]">
          <h1 className="text-lg font-semibold">Account Type</h1>
          <Select
            value={accountType}
            onValueChange={(value) =>
              updateParams({
                accountType: value as AccountTypeFilter,
                offset: 0,
              })
            }
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
          <Button variant="outline" onClick={switchArchived}>
            <Archive />
            {archived ? "View Active" : "View Archived"}
          </Button>
          <Button variant="outline" onClick={handleCsvDownload} disabled={downloadingCsv}>
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
          onPrev: () => updateParams({ offset: Math.max(0, offset - limit) }),
          onNext: () => updateParams({ offset: offset + limit }),
          onPageSizeChange: (size) => {
            updateParams({ limit: size, offset: 0 });
          },
        }}
      />
    </div>
  );
};

export default PropertiesTable;
