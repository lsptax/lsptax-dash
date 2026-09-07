import { useState } from "react";
import { ColumnDef, ColumnFiltersState } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { downloadClientsXlsx } from "@/store/data";
import { Archive, Download, LoaderCircle, UserRoundPlus } from "lucide-react";
import { NavLink } from "react-router-dom";
import TableBuilder from "../../TableBuilder";
import { useClientsQuery } from "@/hooks/queries";
import { TableSkeleton } from "../../TableSkeleton";
import { routes } from "@/routes/ROUTES";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  mergeClientListParams,
  parseClientListParams,
  type AccountTypeFilter,
} from "@/utils/listParams/clients";
import { useListSearchParams } from "@/hooks/useListSearchParams";

interface ClientTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
}

const ClientTable = <TData, TValue>({
  columns,
}: ClientTableProps<TData, TValue>) => {
  const { params, updateParams } = useListSearchParams(
    parseClientListParams,
    mergeClientListParams
  );
  const { search, accountType, offset, limit, archived } = params;
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [downloadingCsv, setDownloadingCsv] = useState(false);

  const { data, isLoading, isError, refetch } = useClientsQuery({
    limit,
    offset,
    search,
    archived,
    accountType: accountType === "all" ? undefined : accountType,
  });

  const clients = (data?.data ?? []) as TData[];
  const total = data?.total ?? 0;
  const hasMore = data?.hasMore ?? false;

  const handleCsvDownload = async () => {
    setDownloadingCsv(true);
    try {
      await downloadClientsXlsx({
        search: search || undefined,
        accountType: accountType === "all" ? undefined : accountType,
        archived,
      });
    } catch (err) {
      console.error("Error downloading CSV:", err);
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
            <div className="h-5 w-40 bg-muted animate-pulse rounded mt-2" />
          </div>
          <div className="flex flex-col w-full gap-2 md:max-w-[220px]">
            <div className="h-5 w-28 bg-muted animate-pulse rounded" />
            <div className="h-10 w-full bg-muted animate-pulse rounded" />
          </div>
          <div className="w-full flex gap-2 justify-end">
            <div className="h-10 w-32 bg-muted animate-pulse rounded" />
            <div className="h-10 w-36 bg-muted animate-pulse rounded" />
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
    <div>
      <div className="portal-toolbar">
        <div className="w-full">
          <p className="text-2xl font-semibold tabular-nums">{total}</p>
          <p className="text-sm text-muted-foreground">{archived ? "Archived clients" : "Active clients"}</p>
        </div>
        <div className="flex flex-col w-full gap-2 md:max-w-[220px]">
          <Select
            value={accountType}
            onValueChange={(value) =>
              updateParams({
                accountType: value as AccountTypeFilter,
                offset: 0,
              })
            }
          >
            <SelectTrigger aria-label="Filter clients by account type">
              <SelectValue placeholder="Account type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All account types</SelectItem>
              <SelectItem value="real">Real</SelectItem>
              <SelectItem value="bpp">BPP</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-full flex gap-2 justify-end">
          <Button variant="outline" onClick={switchArchived}>
            <Archive />
            {archived ? "View Active Clients" : "View Archive"}
          </Button>
          <NavLink to={routes.clients.add()}>
            <Button variant={"blue"}>
              <UserRoundPlus /> Add New Client
            </Button>
          </NavLink>
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
        data={clients}
        columns={columns}
        label="Clients"
        columnFilters={columnFilters}
        setColumnFilters={setColumnFilters}
        emptyState={{
          title: "No clients yet",
          description: "Get started by adding your first client to manage properties and invoices.",
          action: { label: "Add your first client", to: routes.clients.add() },
        }}
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

export default ClientTable;
