import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp } from "lucide-react";
import { EmptyState } from "./EmptyState";
import type { LucideIcon } from "lucide-react";

export interface ServerPaginationProps {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  onPrev: () => void;
  onNext: () => void;
  onPageSizeChange: (size: number) => void;
}

export interface EmptyStateConfig {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; to?: string; onClick?: () => void };
}

interface TableBuilderProps<TData> {
  data: TData[];
  columns: ColumnDef<TData, any>[];
  label: string;
  columnFilters?: ColumnFiltersState;
  setColumnFilters?: React.Dispatch<React.SetStateAction<ColumnFiltersState>>;
  /** When set, table uses server-side pagination (no client-side paging); footer shows total and calls these handlers */
  serverPagination?: ServerPaginationProps;
  /** When set, shown when data is empty instead of "No results." */
  emptyState?: EmptyStateConfig;
}

function TableBuilder<TData>({
  data,
  columns,
  label,
  columnFilters,
  setColumnFilters,
  serverPagination,
  emptyState,
}: TableBuilderProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [pageSize, setPageSize] = useState(10);
  const [pageIndex, setPageIndex] = useState(0);

  const isServerPagination = !!serverPagination;
  const effectivePageSize = isServerPagination
    ? Math.max(serverPagination!.limit, (data?.length ?? 0) || 10)
    : pageSize;

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    manualPagination: isServerPagination,
    pageCount: isServerPagination
      ? Math.ceil((serverPagination?.total ?? 0) / (serverPagination?.limit ?? 1))
      : undefined,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      pagination: {
        pageSize: effectivePageSize,
        pageIndex: isServerPagination ? 0 : pageIndex,
      },
    },
  });

  const handlePageSizeChange = (value: number) => {
    if (isServerPagination && serverPagination) {
      serverPagination.onPageSizeChange(value);
      return;
    }
    setPageSize(value);
    setPageIndex(0);
    table.setPageSize(value);
  };

  const start = isServerPagination && serverPagination
    ? serverPagination.offset + 1
    : pageIndex * pageSize + 1;
  const end = isServerPagination && serverPagination
    ? serverPagination.offset + (data?.length ?? 0)
    : Math.min(pageIndex * pageSize + pageSize, table.getFilteredRowModel().rows.length);
  const total = isServerPagination && serverPagination
    ? serverPagination.total
    : table.getFilteredRowModel().rows.length;
  const canPrev = isServerPagination ? serverPagination!.offset > 0 : table.getCanPreviousPage();
  const canNext = isServerPagination ? serverPagination!.hasMore : table.getCanNextPage();
  const onPrev = isServerPagination ? serverPagination!.onPrev : () => { setPageIndex((i) => Math.max(0, i - 1)); table.previousPage(); };
  const onNext = isServerPagination ? serverPagination!.onNext : () => { setPageIndex((i) => i + 1); table.nextPage(); };
  const displayPageSize = isServerPagination ? serverPagination!.limit : pageSize;
  const currentPage = isServerPagination && serverPagination
    ? Math.floor(serverPagination.offset / serverPagination.limit) + 1
    : pageIndex + 1;
  const totalPages = total > 0 ? Math.ceil(total / displayPageSize) : 1;

  return (
    <div className="rounded-xl border m-4 bg-white p-4 flex flex-col overflow-y-auto h-[calc(100vh-260px)] ">
      <div className="pb-8 flex justify-between">
        <h2 className="text-2xl font-bold">{label}</h2>
        <div className="text-sm">
          Showing{" "}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {pageSize} <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup
                value={displayPageSize.toString()}
                onValueChange={(value) => handlePageSizeChange(Number(value))}
              >
                <DropdownMenuRadioItem value="10">10</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="25">25</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="50">50</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="100">100</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>{" "}
          per page
          {total > 0 && (
            <span className="ml-2 text-muted-foreground">
              ({start}–{end} of {total})
            </span>
          )}
        </div>
      </div>

      <div className="overflow-auto scrollbar-custom flex-1 relative">
        <div className="overflow-x-auto h-full">
          <Table className="table-auto min-w-full">
            <TableHeader className="sticky top-0 z-10 bg-white shadow-sm [&_tr]:border-b">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header, index) => (
                    <TableHead
                      key={header.id}
                      className={`cursor-pointer select-none ${
                        index > 1 ? "hidden md:table-cell" : ""
                      } text-gray-700 font-semibold`}
                      onClick={header.column.getToggleSortingHandler()}
                      aria-sort={
                        header.column.getIsSorted()
                          ? header.column.getIsSorted() === "asc"
                            ? "ascending"
                            : "descending"
                          : undefined
                      }
                      scope="col"
                    >
                      <div className="flex items-center justify-between">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {header.column.getIsSorted() && (
                          <span>
                            {header.column.getIsSorted() === "asc" ? (
                              <ChevronUp className="ml-2 h-4 w-4" />
                            ) : (
                              <ChevronDown className="ml-2 h-4 w-4" />
                            )}
                          </span>
                        )}
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className={`min-h-[48px] hover:bg-muted/50 ${
                      row.getIsSelected() ? "bg-muted" : ""
                    }`}
                  >
                    {row.getVisibleCells().map((cell, index) => (
                      <TableCell
                        key={cell.id}
                        className={index > 1 ? "hidden sm:table-cell" : ""}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                    {/* <TableCell className="sm:hidden">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedRow(row.original)}
                          >
                            See More
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Row Details</DialogTitle>
                          </DialogHeader>
                          <div className="p-4">
                            {selectedRow &&
                              Object.entries(selectedRow).map(([key]) => (
                                <div
                                  key={key}
                                  className="flex justify-between py-2"
                                >
                                  <span className="font-medium">{key}:</span>
                                  <span>{selectedRow[key]}</span>{" "}
                                </div>
                              ))}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell> */}
                  </TableRow>
                ))
              ) : emptyState ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length + 1}
                    className="p-0 align-top"
                  >
                    <EmptyState
                      icon={emptyState.icon}
                      title={emptyState.title}
                      description={emptyState.description}
                      action={emptyState.action}
                    />
                  </TableCell>
                </TableRow>
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length + 1}
                    className="h-24 text-center"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="flex items-center justify-between space-x-2 py-4">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          Page {currentPage} of {totalPages}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant={"blue"}
            size="sm"
            onClick={onPrev}
            disabled={!canPrev}
            aria-label="Previous page"
          >
            Previous
          </Button>
          <Button
            variant={"blue"}
            size="sm"
            onClick={onNext}
            disabled={!canNext}
            aria-label="Next page"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};

export default TableBuilder;
