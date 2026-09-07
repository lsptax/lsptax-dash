import { useMemo, useEffect } from "react";
import { Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { QUERY_META_SUPPRESS_GLOBAL_ERROR_TOAST } from "@/routes/ROUTES";
import {
  downloadOwnerReportCsv,
  getBilledReport,
  getCollectedReport,
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
import { useToast } from "@/hooks/use-toast";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const moneyExact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

function formatMoney(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return Math.abs(value) >= 1000 ? money.format(value) : moneyExact.format(value);
}

function formatRate(value: number | null | undefined) {
  if (value == null) return "—";
  return `${(value * 100).toFixed(1)}%`;
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
  const collectedQuery = useQuery({
    queryKey: ["owner-collected", filters],
    queryFn: () => getCollectedReport(filters),
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
        <h1 className="text-2xl font-semibold">Owner</h1>
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

  return (
    <div className="w-full px-4 sm:px-5 py-4 space-y-3">
      <OwnerFiltersBar
        value={filters}
        onChange={setFilters}
        actions={<OwnerExports filters={filters} />}
      />

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-card p-4 text-sm text-destructive">
          {error instanceof Error ? error.message : "Failed to load owner dashboard"}
          <div className="mt-2">
            <Button variant="outline" size="sm" onClick={() => dashboardQuery.refetch()}>
              Retry
            </Button>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
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
          label="Outstanding"
          value={formatMoney(stats?.outstandingReceivables)}
          hint={`${stats?.unpaidInvoiceCount ?? 0} unpaid`}
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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
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
          title="Collected by month"
          empty="No collections in this filter."
          loading={collectedQuery.isLoading}
          onDownload={() => downloadTable("collected")}
          rows={(collectedQuery.data?.byMonth ?? [])
            .slice()
            .reverse()
            .slice(0, 8)
            .map((row) => [
              `${row.year}-${String(row.month).padStart(2, "0")}`,
              formatMoney(row.collected),
            ])}
        />
        <MiniTable
          title="Largest unpaid"
          empty="No unpaid invoices in this filter."
          loading={unpaidQuery.isLoading}
          onDownload={() => downloadTable("unpaid")}
          rows={(unpaidQuery.data?.largestOutstandingClients ?? []).slice(0, 8).map((row) => [
            row.clientName || `Client ${row.clientId}`,
            formatMoney(row.unpaidAmount),
          ])}
        />
      </div>
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
      {hint ? <div className="text-xs text-muted-foreground mt-1 truncate">{hint}</div> : null}
    </div>
  );
}

function MiniTable({
  title,
  rows,
  empty,
  loading,
  onDownload,
}: {
  title: string;
  rows: string[][];
  empty: string;
  loading?: boolean;
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
      <div className="px-3 py-3">
        {loading ? (
          <div className="p-3 text-sm text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-3 text-sm text-muted-foreground">{empty}</div>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {rows.map(([left, right]) => (
                <tr key={`${left}-${right}`} className="border-b last:border-0">
                  <td className="px-3 py-2.5 text-foreground">{left}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums font-medium">{right}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
