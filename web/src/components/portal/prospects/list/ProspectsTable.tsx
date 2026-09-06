import { useEffect, useMemo, useState } from "react";
import { ColumnFiltersState } from "@tanstack/react-table";
import { downloadProspectsCSV } from "@/store/data";
import TableBuilder from "../../TableBuilder";
import { routes } from "@/routes/ROUTES";
import { Input } from "@/components/ui/input";
import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Download, LoaderCircle, Filter } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getProspectColumns } from "./columns";
import { Prospect } from "@/types/types";
import { useProspectsQuery } from "@/hooks/queries";
import { TableSkeleton } from "../../TableSkeleton";
import {
  mergeProspectListParams,
  parseProspectListParams,
} from "@/utils/listParams/prospects";
import { useListSearchParams } from "@/hooks/useListSearchParams";

const ProspectTable = () => {
  const { params, updateParams } = useListSearchParams(
    parseProspectListParams,
    mergeProspectListParams
  );
  const { search, status, offset, limit, archived } = params;
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [downloadingCsv, setDownloadingCsv] = useState(false);

  useEffect(() => {
    const nextFilters: ColumnFiltersState = [];
    if (search) nextFilters.push({ id: "prospectName", value: search });
    if (status) nextFilters.push({ id: "status", value: status });
    setColumnFilters(nextFilters);
  }, [search, status]);

  const { data, isLoading, isError, refetch } = useProspectsQuery({
    limit,
    offset,
    archived,
  });

  const prospects = (data?.data ?? []) as Prospect[];
  const total = data?.total ?? 0;
  const hasMore = data?.hasMore ?? false;

  const columns = useMemo(
    () => getProspectColumns(() => { refetch(); }),
    [refetch]
  );

  const handleCsvDownload = async () => {
    setDownloadingCsv(true);
    try {
      await downloadProspectsCSV();
    } catch (err) {
      console.error("Error downloading CSV:", err);
    } finally {
      setDownloadingCsv(false);
    }
  };

  const switchArchived = () => {
    updateParams({ archived: !archived, offset: 0 });
  };

  const handleFilterByStatus = (nextStatus: string) => {
    updateParams({ status: nextStatus, offset: 0 });
  };

  if (isLoading) {
    return (
      <>
        <div className="flex border rounded-xl items-center gap-4 bg-white m-4 p-4">
          <div className="flex flex-col p-4 w-full">
            <div className="h-5 w-40 bg-muted animate-pulse rounded mb-2" />
            <div className="h-10 max-w-sm bg-muted animate-pulse rounded" />
          </div>
          <div className="w-full">
            <div className="h-8 w-24 bg-muted animate-pulse rounded" />
            <div className="h-5 w-48 bg-muted animate-pulse rounded mt-2" />
          </div>
          <div className="h-10 w-44 bg-muted animate-pulse rounded" />
          <div className="h-10 w-36 bg-muted animate-pulse rounded" />
          <div className="h-10 w-24 bg-muted animate-pulse rounded" />
        </div>
        <div className="flex justify-end mb-4">
          <div className="h-10 w-32 bg-muted animate-pulse rounded" />
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
      <div className="flex border rounded-xl items-center gap-4 bg-white m-4 p-4">
        <div className="flex flex-col p-4 w-full">
          <h1>Quick search a Prospect</h1>
          <Input
            placeholder="Search Prospect Name..."
            value={search}
            onChange={(event) =>
              updateParams({ search: event.target.value, offset: 0 })
            }
            className="max-w-sm"
            aria-label="Search prospects by name"
          />
        </div>

        <div className="w-full">
          <h2 className="text-2xl font-bold">{total}</h2>
          <h3>Total number of {archived ? "Archived" : "Active"} Prospects</h3>
        </div>
        <div>
          <Button
            onClick={switchArchived}
            className="flex items-center gap-2"
          >
            {archived ? "Show Active Prospects" : "Show Archived Prospects"}
          </Button>
        </div>

        <NavLink to={routes.prospect.add()}>
          <Button className="w-full">Add New Prospect</Button>
        </NavLink>
        <Button onClick={handleCsvDownload} disabled={downloadingCsv}>
          {downloadingCsv ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            <Download />
          )}
        </Button>
      </div>
      <div className="flex justify-end mb-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <Filter size={16} />
              Filter by Status
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => handleFilterByStatus("")}>
              All
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleFilterByStatus("NOT_CONTACTED")}
            >
              Not Contacted
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleFilterByStatus("CONTACTED")}>
              Contacted
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleFilterByStatus("IN_PROGRESS")}
            >
              In Progress
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleFilterByStatus("SIGNED")}>
              Signed
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <TableBuilder
        data={prospects}
        columns={columns}
        label="Prospects"
        columnFilters={columnFilters}
        setColumnFilters={setColumnFilters}
        emptyState={
          archived
            ? undefined
            : {
                title: "No prospects yet",
                description: "Add a prospect to start the conversion pipeline.",
                action: { label: "Add your first prospect", to: routes.prospect.add() },
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

export default ProspectTable;
