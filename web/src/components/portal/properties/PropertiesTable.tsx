import { useEffect, useState } from "react";
import { ColumnDef, ColumnFiltersState } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { ListSearchField, useDebouncedListSearch } from "../ListSearchField";

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
  const { search, client, property, accountType, offset, limit, archived } = params;
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [downloadingCsv, setDownloadingCsv] = useState(false);
  const [loadedClient, setLoadedClient] = useState(client);
  const [loadedProperty, setLoadedProperty] = useState(property);

  const { data, isLoading, isError, isPlaceholderData, refetch } = usePropertiesQuery({
    limit,
    offset,
    search,
    archived,
    accountType: accountType === "all" ? undefined : accountType,
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
  const filtersActive = client !== "" || property !== "";

  const properties = (data?.data ?? []) as TData[];
  const total = data?.total ?? 0;
  const hasMore = data?.hasMore ?? false;

  const handleCsvDownload = async () => {
    setDownloadingCsv(true);
    try {
      await downloadPropertiesXlsx({
        accountType: accountType === "all" ? undefined : accountType,
        client: client || undefined,
        property: property || undefined,
        search: search || undefined,
        archived,
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
      <div className="portal-toolbar !flex-wrap md:!items-end">
        <div className="mr-auto shrink-0">
          <p className="text-2xl font-semibold tabular-nums">{total}</p>
          <p className="text-sm text-muted-foreground">{archived ? "Archived properties" : "Active properties"}</p>
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
          <Label className="text-xs text-muted-foreground">Account Type</Label>
          <Select
            value={accountType}
            onValueChange={(value) =>
              updateParams({
                accountType: value as AccountTypeFilter,
                offset: 0,
              })
            }
          >
            <SelectTrigger className="h-9 w-[9.5rem]" aria-label="Filter by account type">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="real">Real</SelectItem>
              <SelectItem value="bpp">BPP</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" className="h-9" onClick={switchArchived}>
          <Archive />
          {archived ? "View Active" : "View Archived"}
        </Button>
        <Button
          variant="outline"
          className="h-9 w-9 px-0"
          onClick={handleCsvDownload}
          disabled={downloadingCsv}
          aria-label="Download properties"
        >
          {downloadingCsv ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            <Download />
          )}
        </Button>
        {filtersActive ? (
          <Button
            type="button"
            variant="ghost"
            className="h-9"
            onClick={() => updateParams({ client: "", property: "", offset: 0 })}
          >
            Clear
          </Button>
        ) : null}
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
