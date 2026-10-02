import { useMemo, useEffect } from "react";
import { Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { QUERY_META_SUPPRESS_GLOBAL_ERROR_TOAST } from "@/routes/ROUTES";
import {
  downloadOwnerReportCsv,
  getBilledReport,
  getOwnerDashboard,
  getUnpaidReport,
} from "@/api/ownerDashboard";
import OwnerFiltersBar from "./OwnerFilters";
import OwnerExports from "./OwnerExports";
import {
  ownerFiltersFromSearchParams,
  ownerFiltersToSearchParams,
  defaultOwnerFilters,
  shouldApplyOwnerFilterDefaults,
  type OwnerFilters,
} from "@/utils/ownerFilters";
import { currentUserCanViewOwnerDashboard } from "@/utils/ownerRole";
import { formatClientNumberDisplay } from "@/utils/clientContact";
import { useToast } from "@/hooks/use-toast";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatMoney(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return money.format(value);
}

function formatRate(value: number | null | undefined) {
  if (value == null) return "—";
  return `${(value * 100).toFixed(2)}%`;
}

function formatMonth(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export default function OwnerDashboardPage() {
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => ownerFiltersFromSearchParams(params), [params]);
  const canView = currentUserCanViewOwnerDashboard();

  useEffect(() => {
    if (!shouldApplyOwnerFilterDefaults(params)) return;
    setParams(ownerFiltersToSearchParams(defaultOwnerFilters()), { replace: true });
  }, [params, setParams]);

  const setFilters = (next: OwnerFilters) => {
    setParams(ownerFiltersToSearchParams(next), { replace: true });
  };

  const dashboardQuery = useQuery({
    queryKey: ["owner-dashboard", filters],
    queryFn: () => getOwnerDashboard(filters),
    enabled: canView,
    meta: QUERY_META_SUPPRESS_GLOBAL_ERROR_TOAST,
  });
  const billedQuery = useQuery({
    queryKey: ["owner-billed-county", filters],
    queryFn: () => getBilledReport(filters, "county"),
    enabled: canView,
    meta: QUERY_META_SUPPRESS_GLOBAL_ERROR_TOAST,
  });
  const unpaidQuery = useQuery({
    queryKey: ["owner-unpaid", filters],
    queryFn: () => getUnpaidReport(filters),
    enabled: canView,
    meta: QUERY_META_SUPPRESS_GLOBAL_ERROR_TOAST,
  });

  async function downloadTable(kind: "billed" | "collected" | "unpaid", extra?: Record<string, string>) {
    try {
      await downloadOwnerReportCsv(kind, filters, extra);
    } catch (error) {
      toast({
        title: error instanceof Error ? error.message : "Download failed",
        variant: "destructive",
      });
    }
  }

  if (!canView) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-10 max-w-2xl">
        <h1 className="text-2xl font-semibold">Finances</h1>
        <p className="text-sm text-muted-foreground mt-2">
          This view is limited to management users. Ask an admin to set your portal user type to
          owner or admin, then log in again.
        </p>
      </div>
    );
  }

  const stats = dashboardQuery.data;
  const error = dashboardQuery.error;
  const loading = dashboardQuery.isLoading;
  const byMonth = stats?.byMonth ?? [];
  const monthRows = byMonth.map((row) => [
    formatMonth(row.year, row.month),
    formatMoney(row.expected),
    formatMoney(row.collected),
  ]);

  return (
    <div className="w-full px-4 sm:px-5 py-4 space-y-3">
      <OwnerFiltersBar
        value={filters}
        onChange={setFilters}
        actions={<OwnerExports filters={filters} />}
      />

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-card p-4 text-sm text-destructive">
          {error instanceof Error ? error.message : "Failed to load Finances"}
          <div className="mt-2">
            <Button variant="outline" size="sm" onClick={() => dashboardQuery.refetch()}>
              Retry
            </Button>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Collected so far"
          value={formatMoney(stats?.collectedSoFar)}
          hint="All payments in this filter, through today"
          loading={loading}
        />
        <StatCard
          label="Still to collect"
          value={formatMoney(stats?.stillToCollect)}
          hint={`${stats?.unpaidSentCount ?? 0} sent invoices unpaid`}
          loading={loading}
        />
        <StatCard
          label="Total expected"
          value={formatMoney(stats?.totalExpected)}
          hint={`${stats?.sentInvoiceCount ?? 0} sent invoices in this filter`}
          loading={loading}
        />
        <StatCard
          label="Billed this month"
          value={formatMoney(stats?.billedThisMonth)}
          hint={`Last month ${formatMoney(stats?.billedLastMonth)}`}
          loading={loading}
        />
        <StatCard
          label="Collected this month"
          value={formatMoney(stats?.collectedThisMonth)}
          hint={`Last month ${formatMoney(stats?.collectedLastMonth)}`}
          loading={loading}
        />
        <StatCard
          label="Collection rate"
          value={formatRate(stats?.collectionRate)}
          hint={`YTD ${formatMoney(stats?.collectedYtd)} / ${formatMoney(stats?.billedYtd)}`}
          loading={loading}
        />
        <StatCard
          label="Past due"
          value={formatMoney(stats?.pastDueReceivables)}
          hint={`${stats?.pastDueInvoiceCount ?? 0} invoices`}
          loading={loading}
        />
        <StatCard
          label="Tax savings"
          value={formatMoney(stats?.totalTaxSavings)}
          hint={`${formatMoney(stats?.totalValueReductions)} reduced · ${stats?.propertiesProtested ?? 0} protested`}
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <MiniTable
          title="Billed by county"
          empty="No billed invoices in this filter."
          loading={billedQuery.isLoading}
          onDownload={() => downloadTable("billed", { groupBy: "county" })}
          rows={(billedQuery.data?.groups ?? []).slice(0, 8).map((row) => [
            row.county || row.label || "(none)",
            formatMoney(row.billed),
          ])}
        />
        <MiniTable
          title="Largest unpaid"
          empty="No unpaid invoices in this filter."
          loading={unpaidQuery.isLoading}
          onDownload={() => downloadTable("unpaid")}
          rows={(unpaidQuery.data?.largestOutstandingClients ?? []).slice(0, 8).map((row) => [
            row.clientName || formatClientNumberDisplay(row.clientNumber),
            formatMoney(row.unpaidAmount),
          ])}
        />
      </div>

      <MiniTable
        title="Expected and collected by month"
        headers={["Month", "Expected", "Collected"]}
        empty="No sent invoices or payments in this filter."
        loading={loading}
        scroll
        onDownload={() => downloadTable("collected")}
        rows={monthRows}
        footer={
          monthRows.length
            ? [
                "Total",
                formatMoney(stats?.totalExpected),
                formatMoney(stats?.collectedSoFar),
              ]
            : undefined
        }
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  loading,
}: {
  label: string;
  value: string;
  hint?: string;
  loading?: boolean;
}) {
  return (
    <div className="portal-card px-5 py-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      {loading ? (
        <div className="h-7 w-24 bg-muted rounded mt-1.5 animate-pulse" />
      ) : (
        <div className="text-xl font-semibold mt-0.5 tabular-nums">{value}</div>
      )}
      {hint ? <div className="text-xs text-muted-foreground mt-1">{hint}</div> : null}
    </div>
  );
}

function MiniTable({
  title,
  headers,
  rows,
  footer,
  empty,
  loading,
  scroll,
  onDownload,
}: {
  title: string;
  headers?: string[];
  rows: string[][];
  footer?: string[];
  empty: string;
  loading?: boolean;
  scroll?: boolean;
  onDownload?: () => void;
}) {
  return (
    <div className="portal-card overflow-hidden">
      <div className="px-5 py-3 border-b flex items-center justify-between gap-2">
        <div className="text-sm font-semibold">{title}</div>
        {onDownload ? (
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={onDownload}>
            <Download className="h-3.5 w-3.5" />
            <span className="sr-only">Download {title}</span>
          </Button>
        ) : null}
      </div>
      <div className={`px-3 py-3 ${scroll ? "max-h-80 overflow-y-auto" : ""}`}>
        {loading ? (
          <div className="p-3 text-sm text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-3 text-sm text-muted-foreground">{empty}</div>
        ) : (
          <table className="w-full text-sm">
            {headers?.length ? (
              <thead className="sticky top-0 bg-card">
                <tr className="border-b">
                  {headers.map((header, index) => (
                    <th
                      key={header}
                      className={`px-3 py-2 text-xs font-medium text-muted-foreground ${
                        index === 0 ? "text-left" : "text-right"
                      }`}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
            ) : null}
            <tbody>
              {rows.map((cells, rowIndex) => (
                <tr key={`${cells[0]}-${rowIndex}`} className="border-b last:border-0">
                  {cells.map((cell, index) => (
                    <td
                      key={`${cells[0]}-${index}`}
                      className={`px-3 py-2.5 tabular-nums ${
                        index === 0 ? "text-left text-foreground" : "text-right font-medium"
                      }`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            {footer?.length ? (
              <tfoot>
                <tr className="border-t">
                  {footer.map((cell, index) => (
                    <td
                      key={`${cell}-${index}`}
                      className={`sticky bottom-0 bg-card px-3 py-2.5 font-semibold tabular-nums ${
                        index === 0 ? "text-left" : "text-right"
                      }`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              </tfoot>
            ) : null}
          </table>
        )}
      </div>
    </div>
  );
}
