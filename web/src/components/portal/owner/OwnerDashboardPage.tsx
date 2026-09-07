import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { QUERY_META_SUPPRESS_GLOBAL_ERROR_TOAST } from "@/routes/ROUTES";
import {
  getBilledReport,
  getCollectedReport,
  getOwnerDashboard,
  getUnpaidReport,
} from "@/api/ownerDashboard";
import OwnerFiltersBar from "./OwnerFilters";
import {
  ownerFiltersFromSearchParams,
  ownerFiltersToSearchParams,
  type OwnerFilters,
} from "@/utils/ownerFilters";
import { currentUserCanViewOwnerDashboard } from "@/utils/ownerRole";

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
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => ownerFiltersFromSearchParams(params), [params]);
  const canView = currentUserCanViewOwnerDashboard();

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

  if (!canView) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-10 max-w-2xl">
        <h1 className="text-2xl font-semibold">Owner dashboard</h1>
        <p className="text-sm text-muted-foreground mt-2">
          This view is limited to management users. Ask an admin to set your portal user type to
          owner or admin, then log in again.
        </p>
      </div>
    );
  }

  const stats = dashboardQuery.data;
  const error = dashboardQuery.error;

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Owner dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
          Billed vs collected stay separate. Collections are fully paid invoices only (v1). An
          August invoice paid in September is billed in August and collected in September.
        </p>
      </div>

      <OwnerFiltersBar value={filters} onChange={setFilters} />

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-white p-4 text-sm text-destructive">
          {error instanceof Error ? error.message : "Failed to load owner dashboard"}
          <div className="mt-2">
            <Button variant="outline" size="sm" onClick={() => dashboardQuery.refetch()}>
              Retry
            </Button>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <StatCard
          label="Billed this month"
          value={formatMoney(stats?.billedThisMonth)}
          loading={dashboardQuery.isLoading}
        />
        <StatCard
          label="Collected this month"
          value={formatMoney(stats?.collectedThisMonth)}
          loading={dashboardQuery.isLoading}
        />
        <StatCard
          label="Billed YTD"
          value={formatMoney(stats?.billedYtd)}
          loading={dashboardQuery.isLoading}
        />
        <StatCard
          label="Collected YTD"
          value={formatMoney(stats?.collectedYtd)}
          loading={dashboardQuery.isLoading}
        />
        <StatCard
          label="Collection rate"
          value={formatRate(stats?.collectionRate)}
          hint="Collected YTD ÷ billed YTD"
          loading={dashboardQuery.isLoading}
        />
        <StatCard
          label="Outstanding"
          value={formatMoney(stats?.outstandingReceivables)}
          hint={`${stats?.unpaidInvoiceCount ?? 0} unpaid invoices`}
          loading={dashboardQuery.isLoading}
        />
        <StatCard
          label="Past due"
          value={formatMoney(stats?.pastDueReceivables)}
          hint={`${stats?.pastDueInvoiceCount ?? 0} invoices`}
          loading={dashboardQuery.isLoading}
        />
        <StatCard
          label="Active properties"
          value={stats ? String(stats.activeProperties) : "—"}
          loading={dashboardQuery.isLoading}
        />
        <StatCard
          label="Properties invoiced YTD"
          value={stats ? String(stats.propertiesInvoicedYtd) : "—"}
          loading={dashboardQuery.isLoading}
        />
        <StatCard
          label="Value reductions"
          value={formatMoney(stats?.totalValueReductions)}
          loading={dashboardQuery.isLoading}
        />
        <StatCard
          label="Estimated tax savings"
          value={formatMoney(stats?.totalTaxSavings)}
          loading={dashboardQuery.isLoading}
        />
        <StatCard
          label="Properties protested"
          value={stats ? String(stats.propertiesProtested) : "—"}
          loading={dashboardQuery.isLoading}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <MiniTable
          title="Billed by county"
          empty="No billed invoices in this filter."
          loading={billedQuery.isLoading}
          rows={(billedQuery.data?.groups ?? []).slice(0, 8).map((row) => [
            row.county || row.label || "(none)",
            formatMoney(row.billed),
          ])}
        />
        <MiniTable
          title="Collected by month"
          empty="No collections in this filter."
          loading={collectedQuery.isLoading}
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
          title="Largest unpaid clients"
          empty="No unpaid invoices in this filter."
          loading={unpaidQuery.isLoading}
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
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="text-xs text-muted-foreground">{label}</div>
      {loading ? (
        <div className="h-8 w-24 bg-gray-100 rounded mt-2 animate-pulse" />
      ) : (
        <div className="text-2xl font-semibold mt-1 tabular-nums">{value}</div>
      )}
      {hint ? <div className="text-xs text-muted-foreground mt-1">{hint}</div> : null}
    </div>
  );
}

function MiniTable({
  title,
  rows,
  empty,
  loading,
}: {
  title: string;
  rows: string[][];
  empty: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b text-sm font-semibold">{title}</div>
      <div className="p-2">
        {loading ? (
          <div className="p-3 text-sm text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-3 text-sm text-muted-foreground">{empty}</div>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {rows.map(([left, right]) => (
                <tr key={`${left}-${right}`} className="border-b last:border-0">
                  <td className="px-3 py-2 text-gray-700">{left}</td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium">{right}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
