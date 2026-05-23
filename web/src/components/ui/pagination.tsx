import { Button } from "@/components/ui/button";
import type { Table } from "@tanstack/react-table";

interface PaginationProps<TData> {
  table: Table<TData>;
}

function Pagination<TData>({ table }: PaginationProps<TData>) {
  const { pageIndex } = table.getState().pagination;
  const pageCount = table.getPageCount();
  const pageNumbers: number[] = [];
  const startPage = Math.max(pageIndex - 2, 0);
  const endPage = Math.min(pageIndex + 2, pageCount - 1);

  // Create the page numbers array
  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i + 1); // Adjust for 1-based index
  }

  return (
    <div className="flex items-center justify-center space-x-2 py-4">
      {/* Previous Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => table.previousPage()}
        disabled={!table.getCanPreviousPage()}
        aria-label="Previous page"
      >
        {"<<"}
      </Button>

      {/* Page numbers */}
      {pageNumbers.map((pageNumber) => (
        <Button
          key={pageNumber}
          variant="outline"
          size="sm"
          onClick={() => table.setPageIndex(pageNumber - 1)} // Convert to zero-based index
          className={
            pageNumber - 1 === pageIndex ? "bg-blue-500 text-white" : ""
          }
        >
          {pageNumber}
        </Button>
      ))}

      {/* Next Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => table.nextPage()}
        disabled={!table.getCanNextPage()}
        aria-label="Next page"
      >
        {">>"}
      </Button>
    </div>
  );
}

export default Pagination;
