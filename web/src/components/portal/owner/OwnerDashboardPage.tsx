import { useMemo, useEffect, useState, type ReactNode } from "react";
import { Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CashflowChart, CountyChart, UnpaidDonut, type UnpaidStatus } from "./OwnerCharts";
import { QUERY_META_SUPPRESS_GLOBAL_ERROR_TOAST } from "@/routes/ROUTES";
import {
  downloadOwnerReportCsv,
  getOwnerDashboard,
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
import { cn } from "@/lib/utils";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type Tone = "good" | "bad" | "warn" | "billed" | "muted";

const toneText: Record<Tone, string> = {
  good: "text-emerald-600 dark:text-emerald-400",
  bad: "text-red-600 dark:text-red-400",
  warn: "text-amber-600 dark:text-amber-400",
  billed: "text-sky-600 dark:text-sky-400",
  muted: "text-muted-foreground",
};

const toneBorder: Record<Tone, string> = {
  good: "border-l-emerald-500",
  bad: "border-l-red-500",
  warn: "border-l-amber-500",
  billed: "border-l-sky-500",
  muted: "border-l-border",
};

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

function formatYearMonth(value: string) {
  const [year, month] = value.split("-").map(Number);
  if (!year || !month) return value;
  return new Date(year, month - 1, 1).toLocaleString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function selectedMonthHint(filters: OwnerFilters) {
  const months = [...(filters.month ?? [])].sort();
  if (!months.length) {
    const years = filters.taxYear ?? [];
    if (years.length === 1) return `All months · ${years[0]}`;
    if (years.length > 1) return `All months · ${years.join(", ")}`;
    return "All months";
  }
  if (months.length === 1) return formatYearMonth(months[0]);
  if (months.length === 2) return `${formatYearMonth(months[0])} + ${formatYearMonth(months[1])}`;
  return months.map(formatYearMonth).join(", ");
}

function moneyTone(value: number | null | undefined, tone: Tone): Tone {
  if (value == null || value === 0) return "muted";
  return tone;
}

export default function OwnerDashboardPage() {
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => ownerFiltersFromSearchParams(params), [params]);
  const canView = currentUserCanViewOwnerDashboard();
  const [unpaidStatus, setUnpaidStatus] = useState<UnpaidStatus | null>(null);

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
  const monthHint = selectedMonthHint(filters);
  const monthCount = filters.month?.length ?? 0;
  const allMonths = monthCount === 0 && !filters.from && !filters.to;
  const billedAmount = allMonths
    ? byMonth.reduce((sum, row) => sum + row.billed, 0)
    : stats?.billedThisMonth;
  const collectedAmount = allMonths
    ? byMonth.reduce((sum, row) => sum + row.collected, 0)
    : stats?.collectedThisMonth;
  const pastDue = stats?.pastDueReceivables ?? 0;
  const notYetDue = stats?.notYetDueReceivables ?? 0;
  const rate = stats?.collectionRate ?? 0;
  const unpaidClients = (stats?.largestOutstandingClients ?? []).filter(
    (row) => !unpaidStatus || (row.status || "Not due") === unpaidStatus
  );
  const largestUnpaid = Math.max(0, ...unpaidClients.map((row) => row.unpaidAmount));
  const toggleCounty = (county: string) => {
    const current = filters.county ?? [];
    const next = current.includes(county) ? current.filter((value) => value !== county) : [...current, county];
    setFilters({ ...filters, county: next.length ? next : undefined });
  };
  const monthRows = byMonth.map((row) => [
    formatMonth(row.year, row.month),
    <Amount key="billed" value={row.billed} tone="billed" />,
    <Amount key="collected" value={row.collected} tone="good" />,
    <Amount key="outstanding" value={row.outstanding} tone="bad" />,
  ]);
  const counties = (stats?.billedByCounty ?? []).filter((row) => row.billed > 0);

  return (
    <div className="w-full px-4 sm:px-5 py-4 space-y-6">
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

      <Section title="Where the money stands">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            label={monthCount === 1 ? "Collected this month" : "Collected"}
            value={formatMoney(collectedAmount)}
            hint={monthHint}
            tone={moneyTone(collectedAmount, "good")}
            loading={loading}
          />
          <StatCard
            label="Unpaid"
            value={formatMoney(stats?.outstandingReceivables)}
            hint={`${(stats?.unpaidInvoiceCount ?? 0).toLocaleString()} invoices still to collect`}
            tone={moneyTone(stats?.outstandingReceivables, "bad")}
            loading={loading}
          />
          <StatCard
            label="Past due"
            value={formatMoney(stats?.pastDueReceivables)}
            hint={`${(stats?.pastDueInvoiceCount ?? 0).toLocaleString()} overdue`}
            tone={moneyTone(stats?.pastDueReceivables, "bad")}
            loading={loading}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            label={monthCount === 1 ? "Billed this month" : "Billed"}
            value={formatMoney(billedAmount)}
            hint={monthHint}
            tone={moneyTone(billedAmount, "billed")}
            loading={loading}
            compact
          />
          <StatCard
            label="Collected so far"
            value={formatMoney(stats?.collectedSoFar)}
            hint={stats?.periodLabel || "YTD"}
            tone={moneyTone(stats?.collectedSoFar, "good")}
            loading={loading}
            compact
          />
          <StatCard
            label="Collection rate"
            value={formatRate(stats?.collectionRate)}
            hint={`${formatMoney(stats?.collectedSoFar)} of ${formatMoney(stats?.periodBilled)} billed`}
            detail={stats?.periodLabel}
            tone={stats?.collectionRate ? "good" : "muted"}
            loading={loading}
            compact
            meter={stats?.collectionRate == null ? undefined : Math.max(0, Math.min(1, rate))}
          />
        </div>
      </Section>

      <Section title="By month">
        {loading ? (
          <div className="portal-card h-72 animate-pulse bg-muted/40" />
        ) : (
          <CashflowChart
            months={byMonth.slice(-12)}
            onFocusMonth={(key) => setFilters({ ...filters, month: [key], from: undefined, to: undefined })}
          />
        )}
        <MiniTable
          title="Billed, collected, and still unpaid"
          headers={["Month", "Billed", "Collected", "Unpaid"]}
          columns="minmax(0, 1fr) 9rem 9rem 9rem"
          headerTones={["muted", "billed", "good", "bad"]}
          empty="No billing or payments in this filter."
          loading={loading}
          scroll
          onDownload={() => downloadTable("collected")}
          rows={monthRows}
          footer={
            monthRows.length
              ? [
                  "Total",
                  <Amount key="billed" value={byMonth.reduce((sum, row) => sum + row.billed, 0)} tone="billed" />,
                  <Amount key="collected" value={byMonth.reduce((sum, row) => sum + row.collected, 0)} tone="good" />,
                  <Amount key="unpaid" value={byMonth.reduce((sum, row) => sum + row.outstanding, 0)} tone="bad" />,
                ]
              : undefined
          }
        />
      </Section>

      <Section title="Still unpaid">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
          <div className="portal-card px-5 py-4">
            <div className="flex items-baseline justify-between gap-3">
              <div className="text-sm font-semibold">Unpaid invoices</div>
              <div className="text-xs text-muted-foreground">
                {(stats?.unpaidInvoiceCount ?? 0).toLocaleString()} invoices
              </div>
            </div>
            {loading ? (
              <div className="mt-4 h-44 animate-pulse rounded-lg bg-muted/40" />
            ) : (
              <div className="mt-3">
                <UnpaidDonut
                  notYetDue={notYetDue}
                  pastDue={pastDue}
                  notYetDueCount={stats?.notYetDueInvoiceCount ?? 0}
                  pastDueCount={stats?.pastDueInvoiceCount ?? 0}
                  selected={unpaidStatus}
                  onSelect={setUnpaidStatus}
                />
              </div>
            )}
          </div>
          <MiniTable
            title={unpaidStatus ? `Largest unpaid balances · ${unpaidStatus}` : "Largest unpaid balances"}
            headers={["Client", "Status", "Amount"]}
            columns="minmax(0, 1fr) 7.5rem 9rem"
            align={["left", "center", "right"]}
            empty={unpaidStatus ? `No ${unpaidStatus.toLowerCase()} balances in this filter.` : "No unpaid invoices in this filter."}
            loading={loading}
            scroll
            onDownload={() => downloadTable("unpaid")}
            onRowClick={(index) => {
              const clientId = unpaidClients[index]?.clientId;
              if (clientId) setFilters({ ...filters, clientId: String(clientId) });
            }}
            rowTitle="Show only this client"
            rows={unpaidClients.map((row) => [
              <div key="client" className="min-w-0">
                <div className="truncate">{row.clientName || formatClientNumberDisplay(row.clientNumber)}</div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", row.status === "Past due" ? "bg-red-500" : "bg-amber-500")}
                    style={{ width: `${largestUnpaid ? (row.unpaidAmount / largestUnpaid) * 100 : 0}%` }}
                  />
                </div>
              </div>,
              <StatusPill key="status" status={row.status || "Not due"} />,
              <Amount key="amount" value={row.unpaidAmount} tone="bad" />,
            ])}
          />
        </div>
      </Section>

      <Section title="For clients">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            label="Properties protested"
            value={loading ? "—" : (stats?.propertiesProtested ?? 0).toLocaleString()}
            loading={loading}
            compact
          />
          <StatCard
            label="Value reduced"
            value={formatMoney(stats?.totalValueReductions)}
            loading={loading}
            compact
          />
          <StatCard
            label="Tax savings"
            value={formatMoney(stats?.totalTaxSavings)}
            loading={loading}
            compact
          />
        </div>
      </Section>

      <Section title="By county">
        <div className="portal-card overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b px-5 py-3">
            <div className="text-sm font-semibold">Billed by county</div>
            <div className="flex items-center gap-1">
              {filters.county?.length ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => setFilters({ ...filters, county: undefined })}
                >
                  Clear county filter
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => downloadTable("billed", { groupBy: "county" })}
              >
                <Download className="h-3.5 w-3.5" />
                <span className="sr-only">Download Billed by county</span>
              </Button>
            </div>
          </div>
          <div className="px-5 py-4">
            {loading ? (
              <div className="h-48 animate-pulse rounded-lg bg-muted/40" />
            ) : counties.length === 0 ? (
              <div className="text-sm text-muted-foreground">No billed invoices in this filter.</div>
            ) : (
              <CountyChart
                rows={counties.map((row) => ({ county: row.county || row.label || "(none)", billed: row.billed }))}
                selected={filters.county ?? []}
                onToggle={toggleCounty}
              />
            )}
          </div>
        </div>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

function Amount({ value, tone }: { value: number | null | undefined; tone: Tone }) {
  return <span className={cn("tabular-nums", toneText[moneyTone(value, tone)])}>{formatMoney(value)}</span>;
}

function StatusPill({ status }: { status: string }) {
  const pastDue = status === "Past due";
  return (
    <span
      className={cn(
        "inline-flex w-[5.5rem] justify-center rounded-full py-0.5 text-xs font-medium",
        pastDue ? "bg-red-500/15 text-red-600 dark:text-red-400" : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
      )}
    >
      {pastDue ? "Past due" : "Not due"}
    </span>
  );
}

function StatCard({
  label,
  value,
  hint,
  detail,
  tone = "muted",
  loading,
  compact,
  meter,
}: {
  label: string;
  value: string;
  hint?: string;
  detail?: string;
  tone?: Tone;
  loading?: boolean;
  compact?: boolean;
  meter?: number;
}) {
  return (
    <div className={cn("portal-card border-l-4 px-5 py-4", toneBorder[tone])}>
      <div className="text-xs text-muted-foreground">{label}</div>
      {loading ? (
        <div className={cn("mt-1.5 animate-pulse rounded bg-muted", compact ? "h-6 w-24" : "h-7 w-28")} />
      ) : (
        <div className={cn("mt-0.5 font-semibold tabular-nums", toneText[tone], compact ? "text-lg" : "text-xl")}>
          {value}
        </div>
      )}
      {meter != null && !loading ? (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${meter * 100}%` }} />
        </div>
      ) : null}
      {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
      {detail ? <div className="text-xs text-muted-foreground">{detail}</div> : null}
    </div>
  );
}

function columnTemplate(count: number) {
  if (count <= 1) return "minmax(0, 1fr)";
  return ["minmax(0, 1fr)", ...Array.from({ length: count - 1 }, () => "auto")].join(" ");
}

type Align = "left" | "center" | "right";

const alignClass: Record<Align, string> = {
  left: "text-left justify-self-stretch",
  center: "text-center justify-self-center",
  right: "text-right justify-self-stretch",
};

function MiniTable({
  title,
  headers,
  headerTones,
  columns,
  align,
  rows,
  footer,
  empty,
  loading,
  scroll,
  onDownload,
  onRowClick,
  rowTitle,
}: {
  title: string;
  headers?: string[];
  headerTones?: Tone[];
  columns?: string;
  align?: Align[];
  rows: ReactNode[][];
  footer?: ReactNode[];
  empty: string;
  loading?: boolean;
  scroll?: boolean;
  onDownload?: () => void;
  onRowClick?: (index: number) => void;
  rowTitle?: string;
}) {
  const count = headers?.length ?? rows[0]?.length ?? 1;
  const template = columns ?? columnTemplate(count);
  const alignAt = (index: number): Align => align?.[index] ?? (index === 0 ? "left" : "right");
  return (
    <div className="portal-card overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b px-5 py-3">
        <div className="text-sm font-semibold">{title}</div>
        {onDownload ? (
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={onDownload}>
            <Download className="h-3.5 w-3.5" />
            <span className="sr-only">Download {title}</span>
          </Button>
        ) : null}
      </div>
      {loading ? (
        <div className="p-3 text-sm text-muted-foreground">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="p-3 text-sm text-muted-foreground">{empty}</div>
      ) : (
        <div>
          {headers?.length ? (
            <div className="grid items-center border-b px-3" style={{ gridTemplateColumns: template }}>
              {headers.map((header, index) => (
                <div
                  key={header}
                  className={cn(
                    "px-3 py-2 text-xs font-medium",
                    headerTones?.[index] ? toneText[headerTones[index]] : "text-muted-foreground",
                    alignClass[alignAt(index)]
                  )}
                >
                  {header}
                </div>
              ))}
            </div>
          ) : null}
          <div className={scroll ? "max-h-80 overflow-x-hidden overflow-y-auto" : ""}>
            {rows.map((cells, rowIndex) => (
              <div
                key={rowIndex}
                className={cn(
                  "grid items-center border-b px-3 last:border-0",
                  onRowClick && "cursor-pointer transition-colors hover:bg-muted/50"
                )}
                style={{ gridTemplateColumns: template }}
                title={rowTitle}
                role={onRowClick ? "button" : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={onRowClick ? () => onRowClick(rowIndex) : undefined}
                onKeyDown={
                  onRowClick
                    ? (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onRowClick(rowIndex);
                        }
                      }
                    : undefined
                }
              >
                {cells.map((cell, index) => (
                  <div
                    key={index}
                    className={cn(
                      "min-w-0 px-3 py-2.5 text-sm",
                      index === 0 ? "truncate text-foreground" : "font-medium",
                      alignClass[alignAt(index)]
                    )}
                  >
                    {cell}
                  </div>
                ))}
              </div>
            ))}
          </div>
          {footer?.length ? (
            <div className="grid items-center border-t px-3" style={{ gridTemplateColumns: template }}>
              {footer.map((cell, index) => (
                <div
                  key={index}
                  className={cn("px-3 py-2.5 text-sm font-semibold", alignClass[alignAt(index)])}
                >
                  {cell}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
