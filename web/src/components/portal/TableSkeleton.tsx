import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
}

export function TableSkeleton({
  rows = 10,
  columns = 5,
  showHeader = true,
}: TableSkeletonProps) {
  return (
    <div className="rounded-xl border m-4 bg-white p-4 flex flex-col overflow-y-auto h-[calc(100vh-260px)]">
      <div className="pb-8 flex justify-between">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-6 w-40" />
      </div>
      <div className="overflow-auto flex-1">
        <table className="table-auto min-w-full">
          {showHeader && (
            <thead>
              <tr className="border-b">
                {Array.from({ length: columns }).map((_, i) => (
                  <th key={i} className="text-left p-4">
                    <Skeleton className="h-4 w-20" />
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex} className="border-b">
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <td key={colIndex} className="p-4">
                    <Skeleton className="h-4 w-full max-w-[120px]" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-2 py-4">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-16" />
      </div>
    </div>
  );
}
