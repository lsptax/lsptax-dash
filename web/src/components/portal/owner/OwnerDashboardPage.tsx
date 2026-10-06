import { useMemo, useEffect, useState, type ReactNode } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BadgeDollarSign,
  BarChart3,
  CalendarDays,
  CircleAlert,
  Clock,
  Cloud,
  Download,
  FileText,
  Lightbulb,
  MapPin,
  SlidersHorizontal,
  TrendingUp,
  Users,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MonthlyBillingChart, UnpaidDonut, chartColors, type UnpaidStatus } from "./OwnerCharts";
import { QUERY_META_SUPPRESS_GLOBAL_ERROR_TOAST } from "@/routes/ROUTES";
import { downloadOwnerReportCsv, getOwnerDashboard } from "@/api/ownerDashboard";
import OwnerFiltersBar from "./OwnerFilters";
import OwnerExports from "./OwnerExports";
import {
  ownerFiltersFromSearchParams,
  ownerFiltersToSearchParams,
  defaultOwnerFilters,
  shouldApplyOwnerFilterDefaults,
  currentOwnerMonth,
  currentOwnerTaxYear,
  type OwnerFilters,
} from "@/utils/ownerFilters";
import { currentUserCanViewOwnerDashboard } from "@/utils/ownerRole";
import { formatClientNumberDisplay } from "@/utils/clientContact";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const COUNTY_PREVIEW = 8;
const INVOICE_PREVIEW = 5;

function formatMoney(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return money.format(value);
}

function formatCompactMoney(value: number) {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 100_000) return `${sign}$${Math.round(abs / 1000)}K`;
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(1)}K`;
  return formatMoney(value);
}

function formatRate(value: number | null | undefined) {
  if (value == null) return "—";
  return `${(value * 100).toFixed(2)}%`;
}

function formatShare(part: number, whole: number) {
  if (!whole) return "—";
  return `${((part / whole) * 100).toFixed(1)}%`;
}

function percentChange(current: number | null | undefined, previous: number | null | undefined) {
  if (current == null || previous == null || !previous) return null;
  return (current - previous) / previous;
}

function formatYearMonth(value: string) {
  const [year, month] = value.split("-").map(Number);
  if (!year || !month) return value;
  return new Date(year, month - 1, 1).toLocaleString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function monthStamp(year: number, month: number, withYear: boolean) {
  return new Date(year, month - 1, 1).toLocaleString("en-US", {
    month: "short",
    year: withYear ? "2-digit" : undefined,
  });
}

function previousMonthLabel(asOf: string | undefined) {
  const parsed = asOf ? new Date(`${asOf.slice(0, 10)}T12:00:00`) : new Date();
  const base = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  return new Date(base.getFullYear(), base.getMonth() - 1, 1).toLocaleString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function recentMonths(count = 18) {
  const [year, month] = currentOwnerMonth().split("-").map(Number);
  const out: { value: string; label: string }[] = [];
  for (let i = 0; i < count; i += 1) {
    const date = new Date(year, month - 1 - i, 1);
    out.push({
      value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: date.toLocaleString("en-US", { month: "short", year: "numeric" }),
    });
  }
  return out;
}

export default function OwnerDashboardPage() {
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => ownerFiltersFromSearchParams(params), [params]);
  const canView = currentUserCanViewOwnerDashboard();
  const [unpaidStatus, setUnpaidStatus] = useState<UnpaidStatus | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showAllCounties, setShowAllCounties] = useState(false);
  const [showAllInvoices, setShowAllInvoices] = useState(false);
  const monthChoices = useMemo(() => recentMonths(), []);

  useEffect(() => {
    if (params.get("allTime") === "1" || params.get("monthScope") === "all") return;
    const years = filters.taxYear ?? [];
    const legacyYearOnly =
      !filters.month?.length &&
      !filters.from &&
      !filters.to &&
      !filters.calendarYear &&
      !filters.clientId &&
      !filters.propertyId &&
      !filters.county?.length &&
      years.length === 1 &&
      years[0] === currentOwnerTaxYear();
    if (!shouldApplyOwnerFilterDefaults(params) && !legacyYearOnly) return;
    setParams(ownerFiltersToSearchParams(defaultOwnerFilters()), { replace: true });
  }, [params, filters, setParams]);

  const setFilters = (next: OwnerFilters) => {
    const nextParams = ownerFiltersToSearchParams(next);
    if (!next.month?.length && !next.from && !next.to) nextParams.set("monthScope", "all");
    setParams(nextParams, { replace: true });
  };

  const dashboardQuery = useQuery({
    queryKey: ["owner-dashboard", filters],
    queryFn: () => getOwnerDashboard(filters),
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
      <div className="max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold">Finances</h1>
        <p className="mt-2 text-sm text-muted-foreground">
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
  const chartLoading = loading;
  const currentMonth = currentOwnerMonth();
  const liveMonth =
    !filters.from &&
    !filters.to &&
    (!filters.month?.length || (filters.month.length === 1 && filters.month[0] === currentMonth));
  const monthValue =
    filters.from || filters.to || (filters.month && filters.month.length > 1)
      ? "custom"
      : filters.month?.length === 1
        ? filters.month[0]
        : "all";
  const compareLabel = previousMonthLabel(stats?.asOf);
  const billedDelta = liveMonth ? percentChange(stats?.billedThisMonth, stats?.billedLastMonth) : null;
  const collectedDelta = liveMonth ? percentChange(stats?.collectedThisMonth, stats?.collectedLastMonth) : null;
  const pastDue = stats?.pastDueReceivables ?? 0;
  const notYetDue = stats?.notYetDueReceivables ?? 0;
  const outstanding = stats?.outstandingReceivables ?? 0;
  const unpaidClients = (stats?.largestOutstandingClients ?? []).filter(
    (row) => !unpaidStatus || (row.status || "Not due") === unpaidStatus
  );
  const visibleInvoices = showAllInvoices ? unpaidClients : unpaidClients.slice(0, INVOICE_PREVIEW);
  const counties = (stats?.billedByCounty ?? []).filter((row) => row.billed > 0);
  const visibleCounties = showAllCounties ? counties : counties.slice(0, COUNTY_PREVIEW);
  const topCounty = counties[0];
  const chartMonths = byMonth.slice(-12);
  const chartSpansYears = new Set(chartMonths.map((row) => row.year)).size > 1;
  const narrowed = Boolean(
    filters.from ||
      filters.to ||
      filters.calendarYear ||
      filters.clientId ||
      filters.propertyId ||
      filters.county?.length ||
      filters.month?.length
  );
  const monthRate = stats?.billedThisMonth ? (stats.collectedThisMonth ?? 0) / stats.billedThisMonth : null;
  const priorRate = stats?.billedLastMonth ? (stats.collectedLastMonth ?? 0) / stats.billedLastMonth : null;
  const ratePoints = liveMonth && monthRate != null && priorRate != null ? (monthRate - priorRate) * 100 : null;

  const toggleCounty = (county: string) => {
    const current = filters.county ?? [];
    const next = current.includes(county) ? current.filter((value) => value !== county) : [...current, county];
    setFilters({ ...filters, county: next.length ? next : undefined });
  };

  const setOverviewMonth = (next: string) => {
    if (next === "custom") return;
    if (next === "all") {
      setFilters({ ...filters, month: undefined, from: undefined, to: undefined });
      return;
    }
    setFilters({ ...filters, month: [next], from: undefined, to: undefined });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 px-4 py-3 sm:px-5">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Financial Overview</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={monthValue} onValueChange={setOverviewMonth}>
            <SelectTrigger className="h-9 w-[11.5rem] bg-card" aria-label="Overview month">
              <div className="flex min-w-0 items-center gap-2">
                <CalendarDays className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <SelectValue placeholder="Month" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {monthValue === "custom" ? (
                <SelectItem value="custom" disabled>
                  Custom range
                </SelectItem>
              ) : (
                <SelectItem value="all">All months</SelectItem>
              )}
              {(monthValue !== "custom" &&
              monthValue !== "all" &&
              !monthChoices.some((month) => month.value === monthValue)
                ? [{ value: monthValue, label: formatYearMonth(monthValue) }, ...monthChoices]
                : monthChoices
              ).map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant={showFilters || narrowed ? "secondary" : "outline"}
            size="sm"
            className="gap-1.5"
            onClick={() => setShowFilters((open) => !open)}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
          </Button>
          <OwnerExports filters={filters} />
        </div>
      </div>

      {showFilters ? <OwnerFiltersBar value={filters} onChange={setFilters} /> : null}

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

      <div className="grid shrink-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Billed This Month"
          value={formatMoney(stats?.billedThisMonth)}
          loading={loading}
          className="bg-sky-500/[0.06]"
          delta={billedDelta}
          hint={liveMonth ? compareLabel : monthValue !== "custom" ? formatYearMonth(monthValue) : "Selected range"}
        />
        <KpiCard
          label="Collected This Month"
          value={formatMoney(stats?.collectedThisMonth)}
          loading={loading}
          className="bg-cyan-500/[0.06]"
          delta={collectedDelta}
          hint={liveMonth ? compareLabel : monthValue !== "custom" ? formatYearMonth(monthValue) : "Selected range"}
        />
        <KpiCard
          label="Expected to Collect"
          value={formatMoney(outstanding)}
          loading={loading}
          className="bg-violet-500/[0.07]"
          hint={`${(stats?.unpaidInvoiceCount ?? 0).toLocaleString()} unpaid invoices`}
        />
        <div className="portal-card flex h-full flex-col px-3 py-2 max-xl:order-last sm:col-span-2 xl:col-span-1 xl:col-start-4 xl:row-span-2 xl:row-start-1">
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            Client Results
          </div>
          <div className="mt-2 flex flex-1 flex-col justify-between gap-2">
            <ResultRow
              icon={<FileText className="h-3.5 w-3.5" />}
              iconClass="bg-sky-500/15 text-sky-500"
              label="Properties Protested"
              value={loading ? "—" : (stats?.propertiesProtested ?? 0).toLocaleString()}
              loading={loading}
            />
            <ResultRow
              icon={<Cloud className="h-3.5 w-3.5" />}
              iconClass="bg-teal-500/15 text-teal-500"
              label="Total Value Reduced"
              value={formatMoney(stats?.totalValueReductions)}
              loading={loading}
            />
            <ResultRow
              icon={<BadgeDollarSign className="h-3.5 w-3.5" />}
              iconClass="bg-emerald-500/15 text-emerald-500"
              label="Client Tax Savings"
              value={formatMoney(stats?.totalTaxSavings)}
              loading={loading}
            />
          </div>
        </div>
        <KpiCard
          label="Collected YTD"
          value={formatMoney(stats?.collectedYtd)}
          loading={loading}
          className="bg-teal-500/[0.06]"
          hint={stats?.periodLabel || "Year to date"}
        />
        <KpiCard
          label="Past Due"
          value={formatMoney(pastDue)}
          loading={loading}
          className="border-rose-500/30 bg-rose-500/10"
          hint={`${(stats?.pastDueInvoiceCount ?? 0).toLocaleString()} past due invoices`}
          hintClass="text-rose-500/90"
        />
        <KpiCard
          label="Collection Rate"
          value={formatRate(stats?.collectionRate)}
          loading={loading}
          className="bg-sky-500/[0.05]"
          hint={
            <>
              <span className="whitespace-nowrap">{formatMoney(stats?.collectedSoFar)} collected</span>
              {" / "}
              <span className="whitespace-nowrap">{formatMoney(stats?.periodBilled)} billed</span>
            </>
          }
        />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 xl:grid-cols-3">
        <Panel
          className="h-full"
          icon={<MapPin className="h-3.5 w-3.5 text-sky-500" />}
          title="Revenue Billed by County"
          action={
            <div className="flex items-center gap-1">
              {filters.county?.length ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setFilters({ ...filters, county: undefined })}
                >
                  Clear
                </Button>
              ) : null}
              {counties.length > COUNTY_PREVIEW ? (
                <button
                  type="button"
                  className="px-1 text-xs font-medium text-sky-500 hover:underline"
                  onClick={() => setShowAllCounties((open) => !open)}
                >
                  {showAllCounties ? "Show less" : "View all"}
                </button>
              ) : null}
              <IconDownload label="Billed by county" onClick={() => downloadTable("billed", { groupBy: "county" })} />
            </div>
          }
        >
          {loading ? (
            <div className="h-64 animate-pulse bg-muted/40" />
          ) : visibleCounties.length === 0 ? (
            <div className="px-4 py-6 text-sm text-muted-foreground">No billed invoices in this filter.</div>
          ) : (
            <div className={showAllCounties ? "max-h-80 overflow-y-auto" : undefined}>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] border-b px-3 py-1.5 text-xs text-muted-foreground">
                <span>County</span>
                <span>{filters.month?.length === 1 ? "Billed This Month" : "Billed"}</span>
              </div>
              {visibleCounties.map((row) => {
                const name = row.county || row.label || "(none)";
                const selected = (filters.county ?? []).includes(name);
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => toggleCounty(name)}
                    className={cn(
                      "grid w-full grid-cols-[minmax(0,1fr)_auto] items-center border-b px-3 py-1.5 text-left text-sm last:border-0 hover:bg-muted/40",
                      selected && "bg-sky-500/10"
                    )}
                  >
                    <span className="truncate">{name}</span>
                    <span className="tabular-nums">{formatMoney(row.billed)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </Panel>

        <Panel
          className="h-full"
          icon={<BarChart3 className="h-3.5 w-3.5 text-sky-500" />}
          title="Monthly Billing & Collections"
          action={
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <LegendDot color={chartColors.billed} label="Billed" />
              <LegendDot color={chartColors.collected} label="Collected" />
            </div>
          }
        >
          <div className="h-44 px-2 pb-1">
            {chartLoading ? (
              <div className="h-full animate-pulse rounded-lg bg-muted/40" />
            ) : (
              <MonthlyBillingChart
                months={chartMonths}
                onFocusMonth={(key) => setFilters({ ...filters, month: [key], from: undefined, to: undefined })}
              />
            )}
          </div>
          {chartLoading ? null : chartMonths.length ? (
            <div className="shrink-0 overflow-auto border-t">
              <div className="grid grid-cols-[minmax(0,1fr)_5.75rem_5.75rem_6rem] gap-2 border-b px-3 py-1.5 text-xs">
                <span className="text-muted-foreground">Month</span>
                <span className="text-right text-sky-500">Billed</span>
                <span className="text-right text-cyan-500">Collected</span>
                <span className="text-right text-muted-foreground">Outstanding</span>
              </div>
              {chartMonths.map((row) => (
                <div
                  key={`${row.year}-${row.month}`}
                  className="grid grid-cols-[minmax(0,1fr)_5.75rem_5.75rem_6rem] gap-2 border-b px-3 py-1.5 text-sm last:border-0"
                >
                  <span>{monthStamp(row.year, row.month, chartSpansYears)}</span>
                  <span className="text-right tabular-nums text-sky-500">{formatMoney(row.billed)}</span>
                  <span className="text-right tabular-nums text-cyan-500">{formatMoney(row.collected)}</span>
                  <span className="text-right tabular-nums">{formatMoney(row.outstanding)}</span>
                </div>
              ))}
            </div>
          ) : null}
        </Panel>

        <div className="flex h-full min-h-0 flex-col gap-3">
          <Panel title="Total Unpaid / Expected to Collect" className="h-auto shrink-0">
            <div className="px-3 pb-2">
              {loading ? (
                <div className="h-6 w-32 animate-pulse rounded bg-muted" />
              ) : (
                <div className="text-2xl font-semibold tabular-nums leading-none">{formatMoney(outstanding)}</div>
              )}
              <div className="mt-0.5 text-xs text-muted-foreground">
                {(stats?.unpaidInvoiceCount ?? 0).toLocaleString()} unpaid invoices
              </div>
              <div className="mt-1">
                {loading ? (
                  <div className="h-40 animate-pulse rounded-lg bg-muted/40" />
                ) : (
                  <UnpaidDonut
                    notYetDue={notYetDue}
                    pastDue={pastDue}
                    notYetDueCount={stats?.notYetDueInvoiceCount ?? 0}
                    pastDueCount={stats?.pastDueInvoiceCount ?? 0}
                    selected={unpaidStatus}
                    onSelect={setUnpaidStatus}
                  />
                )}
              </div>
            </div>
          </Panel>

          <Panel className="h-auto min-h-0 flex-1" title="Largest Outstanding Invoices"
            action={
              <div className="flex items-center gap-1">
                {unpaidClients.length > INVOICE_PREVIEW ? (
                  <button
                    type="button"
                    className="px-1 text-xs font-medium text-sky-500 hover:underline"
                    onClick={() => setShowAllInvoices((open) => !open)}
                  >
                    {showAllInvoices ? "Show less" : "View all"}
                  </button>
                ) : null}
                <IconDownload label="Largest unpaid balances" onClick={() => downloadTable("unpaid")} />
              </div>
            }
          >
            {loading ? (
              <div className="h-40 animate-pulse bg-muted/40" />
            ) : visibleInvoices.length === 0 ? (
              <div className="px-4 py-6 text-sm text-muted-foreground">
                {unpaidStatus ? `No ${unpaidStatus.toLowerCase()} balances in this filter.` : "No unpaid invoices in this filter."}
              </div>
            ) : (
              <div className={showAllInvoices ? "max-h-80 overflow-y-auto" : undefined}>
                <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto_4.75rem] gap-2 border-b bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
                  <span>Client</span>
                  <span className="text-right">Amount</span>
                  <span className="text-right">Status</span>
                </div>
                {visibleInvoices.map((row) => (
                  <button
                    key={row.clientId}
                    type="button"
                    title="Show only this client"
                    onClick={() => setFilters({ ...filters, clientId: String(row.clientId) })}
                    className="grid w-full shrink-0 grid-cols-[minmax(0,1fr)_auto_4.75rem] items-center gap-2 border-b px-3 py-1.5 text-left text-sm last:border-0 hover:bg-muted/40"
                  >
                    <span className="truncate">{row.clientName || formatClientNumberDisplay(row.clientNumber)}</span>
                    <span className="text-right tabular-nums">{formatMoney(row.unpaidAmount)}</span>
                    <span className="flex justify-end">
                      <StatusPill status={row.status || "Not due"} />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>

      <div className="portal-card grid shrink-0 grid-cols-1 divide-y md:grid-cols-2 md:divide-x md:divide-y-0 xl:grid-cols-5">
        <Takeaway
          icon={<Lightbulb className="h-3.5 w-3.5 text-amber-400" />}
          iconClass="bg-amber-500/15"
          title="Key Takeaways"
        />
        <Takeaway
          icon={<TrendingUp className="h-3.5 w-3.5 text-emerald-400" />}
          iconClass="bg-emerald-500/15"
          title={
            ratePoints == null
              ? "Collection rate"
              : ratePoints >= 0
                ? "Collection rate is up"
                : "Collection rate is down"
          }
          detail={
            ratePoints == null
              ? formatRate(stats?.collectionRate)
              : `${ratePoints >= 0 ? "+" : ""}${Math.round(ratePoints)}% vs. last month`
          }
          detailClass={ratePoints == null ? undefined : ratePoints >= 0 ? "text-emerald-500" : "text-rose-500"}
        />
        <Takeaway
          icon={<Clock className="h-3.5 w-3.5 text-sky-400" />}
          iconClass="bg-sky-500/15"
          title={`${formatCompactMoney(outstanding)} still expected to collect`}
          detail={`(${(stats?.unpaidInvoiceCount ?? 0).toLocaleString()} invoices)`}
        />
        <Takeaway
          icon={<CircleAlert className="h-3.5 w-3.5 text-rose-400" />}
          iconClass="bg-rose-500/15"
          title={`${formatCompactMoney(pastDue)} is past due`}
          detail={`(${formatShare(pastDue, outstanding)} of total unpaid)`}
          detailClass="text-rose-400"
        />
        <Takeaway
          icon={<MapPin className="h-3.5 w-3.5 text-sky-400" />}
          iconClass="bg-sky-500/15"
          title="Top county by revenue"
          detail={topCounty ? `${topCounty.label || topCounty.county || "(none)"} · ${formatMoney(topCounty.billed)}` : "—"}
        />
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  hint,
  delta,
  loading,
  className,
  hintClass,
}: {
  label: string;
  value: string;
  hint?: ReactNode;
  delta?: number | null;
  loading?: boolean;
  className?: string;
  hintClass?: string;
}) {
  return (
    <div className={cn("portal-card px-3 py-2", className)}>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        {loading ? (
          <div className="mt-1 h-5 w-24 animate-pulse rounded bg-muted" />
        ) : (
          <div className="text-xl font-semibold tabular-nums leading-tight tracking-tight">{value}</div>
        )}
        {delta != null ? (
          <div className={cn("mt-0.5 flex items-center gap-0.5 text-xs", delta >= 0 ? "text-emerald-500" : "text-rose-500")}>
            {delta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            <span>
              {delta >= 0 ? "+" : ""}
              {Math.round(delta * 100)}% vs. {hint}
            </span>
          </div>
        ) : hint ? (
          <div className={cn("mt-0.5 text-xs leading-tight text-muted-foreground", hintClass)}>{hint}</div>
        ) : null}
      </div>
    </div>
  );
}

function ResultRow({
  icon,
  iconClass,
  label,
  value,
  loading,
}: {
  icon: ReactNode;
  iconClass: string;
  label: string;
  value: string;
  loading?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-md", iconClass)}>{icon}</div>
      <div className="min-w-0">
        <div className="text-xs leading-tight text-muted-foreground">{label}</div>
        {loading ? (
          <div className="mt-1 h-5 w-24 animate-pulse rounded bg-muted" />
        ) : (
          <div className="text-lg font-semibold tabular-nums leading-tight tracking-tight">{value}</div>
        )}
      </div>
    </div>
  );
}

function Panel({
  title,
  icon,
  action,
  children,
  className,
}: {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("portal-card flex min-h-0 flex-col overflow-hidden", className)}>
      <div className="flex shrink-0 items-center justify-between gap-2 px-3 py-2">
        <div className="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
          {icon}
          <span>{title}</span>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const pastDue = status === "Past due";
  return (
    <span
      className={cn(
        "inline-flex min-w-[4.6rem] justify-center rounded-md px-2 py-0.5 text-xs font-medium",
        pastDue
          ? "bg-rose-500/15 text-rose-600 dark:text-rose-300"
          : "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300"
      )}
    >
      {pastDue ? "Past Due" : "Not Due"}
    </span>
  );
}

function IconDownload({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={onClick}>
      <Download className="h-3.5 w-3.5" />
      <span className="sr-only">Download {label}</span>
    </Button>
  );
}

function Takeaway({
  icon,
  iconClass,
  title,
  detail,
  detailClass,
}: {
  icon: ReactNode;
  iconClass: string;
  title: string;
  detail?: string;
  detailClass?: string;
}) {
  return (
    <div className="flex min-h-[4.75rem] items-center gap-2.5 px-3 py-4">
      <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", iconClass)}>{icon}</div>
      <div className="min-w-0">
        <div className="text-sm font-medium leading-tight">{title}</div>
        {detail ? <div className={cn("text-xs leading-tight text-muted-foreground", detailClass)}>{detail}</div> : null}
      </div>
    </div>
  );
}
