import { useMemo, useState } from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const chartColors = {
  billed: "#3b82f6",
  collected: "#22d3ee",
  unpaid: "#f43f5e",
  notDue: "#3b82f6",
};

function formatMoney(value: number) {
  return money.format(value || 0);
}

function formatAxisMoney(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1000) return `$${Math.round(value / 1000)}K`;
  return `$${Math.round(value)}`;
}

function monthLabel(year: number, month: number, style: "short" | "long") {
  return new Date(year, month - 1, 1).toLocaleString("en-US", {
    month: style,
    year: style === "short" ? "2-digit" : "numeric",
  });
}

function percent(part: number, whole: number) {
  if (!whole) return "—";
  return `${((part / whole) * 100).toFixed(2)}%`;
}

type ChartTooltipRow = { name?: string | number; value?: number | string; color?: string };

function ChartTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const rows = payload as ChartTooltipRow[];
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      {label ? <div className="mb-1 font-medium text-foreground">{label}</div> : null}
      {rows.map((row) => (
        <div key={String(row.name)} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ background: row.color }} />
            {row.name}
          </span>
          <span className="font-medium tabular-nums text-foreground">{formatMoney(Number(row.value))}</span>
        </div>
      ))}
    </div>
  );
}

function ToggleChip({
  active,
  color,
  label,
  onClick,
}: {
  active: boolean;
  color: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition",
        active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground opacity-60 hover:opacity-100"
      )}
    >
      <span className="h-2 w-2 rounded-full" style={{ background: active ? color : "hsl(var(--muted-foreground))" }} />
      {label}
    </button>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border bg-muted/50 p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition",
            value === option.value ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export type CashflowMonth = {
  year: number;
  month: number;
  billed: number;
  collected: number;
  outstanding: number;
};

type Series = "billed" | "collected" | "unpaid";

export function MonthlyBillingChart({
  months,
  onFocusMonth,
}: {
  months: CashflowMonth[];
  onFocusMonth?: (key: string) => void;
}) {
  const data = useMemo(() => {
    const years = new Set(months.map((row) => row.year));
    const withYear = years.size > 1;
    return months.map((row) => ({
      key: `${row.year}-${String(row.month).padStart(2, "0")}`,
      label: new Date(row.year, row.month - 1, 1).toLocaleString("en-US", {
        month: "short",
        year: withYear ? "2-digit" : undefined,
      }),
      billed: row.billed,
      collected: row.collected,
    }));
  }, [months]);

  if (!data.length) {
    return <div className="py-10 text-sm text-muted-foreground">No billing or payments in this filter.</div>;
  }

  return (
    <div className="h-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          barGap={2}
          barCategoryGap="22%"
          margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
          onClick={(state) => {
            const index = state?.activeTooltipIndex;
            if (index == null || !onFocusMonth) return;
            const row = data[Number(index)];
            if (row) onFocusMonth(row.key);
          }}
        >
          <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
          <YAxis width={48} tick={{ fontSize: 12 }} tickFormatter={formatAxisMoney} tickLine={false} axisLine={false} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.35 }} />
          <Bar
            dataKey="billed"
            name="Billed"
            fill={chartColors.billed}
            radius={[3, 3, 0, 0]}
            maxBarSize={16}
            className={onFocusMonth ? "cursor-pointer" : undefined}
          />
          <Bar
            dataKey="collected"
            name="Collected"
            fill={chartColors.collected}
            radius={[3, 3, 0, 0]}
            maxBarSize={16}
            className={onFocusMonth ? "cursor-pointer" : undefined}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CashflowChart({
  months,
  onFocusMonth,
}: {
  months: CashflowMonth[];
  onFocusMonth: (key: string) => void;
}) {
  const [view, setView] = useState<"monthly" | "running">("monthly");
  const [hidden, setHidden] = useState<Set<Series>>(new Set());
  const [selected, setSelected] = useState<number | null>(null);

  const data = useMemo(() => {
    let billedSum = 0;
    let collectedSum = 0;
    return months.map((row) => {
      billedSum += row.billed;
      collectedSum += row.collected;
      return {
        key: `${row.year}-${String(row.month).padStart(2, "0")}`,
        label: monthLabel(row.year, row.month, "short"),
        longLabel: monthLabel(row.year, row.month, "long"),
        billed: row.billed,
        collected: row.collected,
        unpaid: row.outstanding,
        billedRunning: billedSum,
        collectedRunning: collectedSum,
      };
    });
  }, [months]);

  const active = selected != null ? data[selected] : undefined;
  const show = (series: Series) => !hidden.has(series);
  const toggle = (series: Series) =>
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(series)) next.delete(series);
      else next.add(series);
      return next;
    });

  if (!data.length) return null;

  return (
    <div className="portal-card px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          <ToggleChip active={show("billed")} color={chartColors.billed} label="Billed" onClick={() => toggle("billed")} />
          <ToggleChip
            active={show("collected")}
            color={chartColors.collected}
            label="Collected"
            onClick={() => toggle("collected")}
          />
          {view === "monthly" ? (
            <ToggleChip active={show("unpaid")} color={chartColors.unpaid} label="Still unpaid" onClick={() => toggle("unpaid")} />
          ) : null}
        </div>
        <Segmented
          value={view}
          onChange={setView}
          options={[
            { value: "monthly", label: "Each month" },
            { value: "running", label: "Running total" },
          ]}
        />
      </div>

      <div className={cn("mt-4 grid gap-4", active && "lg:grid-cols-[minmax(0,1fr)_15rem]")}>
        <div className="h-64 cursor-pointer">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={data}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              onClick={(state) => {
                const index = state?.activeTooltipIndex;
                if (index == null) return;
                setSelected((current) => (current === index ? null : index));
              }}
            >
              <defs>
                <linearGradient id="billedFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartColors.billed} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={chartColors.billed} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="collectedFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartColors.collected} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={chartColors.collected} stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis width={56} tick={{ fontSize: 11 }} tickFormatter={formatAxisMoney} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }} />
              {active ? <ReferenceLine x={active.label} stroke="hsl(var(--foreground))" strokeOpacity={0.25} /> : null}

              {view === "monthly" ? (
                <>
                  {show("billed") ? (
                    <Area
                      type="monotone"
                      dataKey="billed"
                      name="Billed"
                      stroke={chartColors.billed}
                      strokeWidth={2}
                      fill="url(#billedFill)"
                      activeDot={{ r: 5 }}
                    />
                  ) : null}
                  {show("collected") ? (
                    <Area
                      type="monotone"
                      dataKey="collected"
                      name="Collected"
                      stroke={chartColors.collected}
                      strokeWidth={2}
                      fill="url(#collectedFill)"
                      activeDot={{ r: 5 }}
                    />
                  ) : null}
                  {show("unpaid") ? (
                    <Line
                      type="monotone"
                      dataKey="unpaid"
                      name="Still unpaid"
                      stroke={chartColors.unpaid}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                    />
                  ) : null}
                </>
              ) : (
                <>
                  {show("billed") ? (
                    <Area
                      type="monotone"
                      dataKey="billedRunning"
                      name="Billed so far"
                      stroke={chartColors.billed}
                      strokeWidth={2}
                      fill="url(#billedFill)"
                      activeDot={{ r: 5 }}
                    />
                  ) : null}
                  {show("collected") ? (
                    <Area
                      type="monotone"
                      dataKey="collectedRunning"
                      name="Collected so far"
                      stroke={chartColors.collected}
                      strokeWidth={2}
                      fill="url(#collectedFill)"
                      activeDot={{ r: 5 }}
                    />
                  ) : null}
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {active ? (
          <MonthDetail
            row={active}
            running={view === "running"}
            canFocus={data.length > 1}
            onFocus={() => onFocusMonth(active.key)}
            onClose={() => setSelected(null)}
          />
        ) : null}
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        {data.length > 1 ? "Click a month to see its breakdown." : "Pick more months in the filters to see a trend."}
      </div>
    </div>
  );
}

function MonthDetail({
  row,
  running,
  canFocus,
  onFocus,
  onClose,
}: {
  row: {
    longLabel: string;
    billed: number;
    collected: number;
    unpaid: number;
    billedRunning: number;
    collectedRunning: number;
  };
  running: boolean;
  canFocus: boolean;
  onFocus: () => void;
  onClose: () => void;
}) {
  const billed = running ? row.billedRunning : row.billed;
  const collected = running ? row.collectedRunning : row.collected;
  const paidOfBilled = Math.max(0, row.billed - row.unpaid);
  const paidShare = row.billed > 0 ? Math.min(1, paidOfBilled / row.billed) : 0;

  return (
    <div className="relative flex flex-col rounded-lg border bg-muted/30 p-4">
      <button
        type="button"
        aria-label="Close month details"
        className="absolute right-2 top-2 rounded-sm p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        onClick={onClose}
      >
        <X className="h-3.5 w-3.5" />
      </button>
      <div className="pr-5 text-sm font-semibold">{row.longLabel}</div>
      <div className="text-xs text-muted-foreground">{running ? "Total up to this month" : "This month only"}</div>
      <dl className="mt-3 space-y-2 text-sm">
        <DetailRow color={chartColors.billed} label="Billed" value={formatMoney(billed)} />
        <DetailRow color={chartColors.collected} label="Collected" value={formatMoney(collected)} />
        {running ? (
          <DetailRow color={chartColors.unpaid} label="Gap" value={formatMoney(Math.max(0, billed - collected))} />
        ) : (
          <DetailRow color={chartColors.unpaid} label="Still unpaid" value={formatMoney(row.unpaid)} />
        )}
      </dl>
      {!running && row.billed > 0 ? (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>This month's invoices paid</span>
            <span className="font-medium text-foreground">{percent(paidOfBilled, row.billed)}</span>
          </div>
          <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-red-500/25">
            <div className="bg-emerald-500" style={{ width: `${paidShare * 100}%` }} />
          </div>
        </div>
      ) : null}
      {canFocus ? (
        <div className="mt-auto pt-4">
          <Button type="button" variant="outline" size="sm" className="w-full" onClick={onFocus}>
            Show only this month
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function DetailRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex items-center gap-1.5 text-muted-foreground">
        <span className="h-2 w-2 rounded-full" style={{ background: color }} />
        {label}
      </dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}

export type UnpaidStatus = "Past due" | "Not due";

export function UnpaidDonut({
  notYetDue,
  pastDue,
  notYetDueCount,
  pastDueCount,
  selected,
  onSelect,
}: {
  notYetDue: number;
  pastDue: number;
  notYetDueCount: number;
  pastDueCount: number;
  selected: UnpaidStatus | null;
  onSelect: (status: UnpaidStatus | null) => void;
}) {
  const total = notYetDue + pastDue;
  const slices: { status: UnpaidStatus; label: string; value: number; count: number; color: string }[] = [
    { status: "Past due", label: "Past Due", value: pastDue, count: pastDueCount, color: chartColors.unpaid },
    { status: "Not due", label: "Not Yet Due", value: notYetDue, count: notYetDueCount, color: chartColors.notDue },
  ];
  const pick = (status: UnpaidStatus) => onSelect(selected === status ? null : status);

  return (
    <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative h-40 w-40 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={total > 0 ? slices : [{ status: "none", value: 1, color: "hsl(var(--muted))" }]}
              dataKey="value"
              innerRadius={58}
              outerRadius={74}
              paddingAngle={total > 0 && pastDue > 0 && notYetDue > 0 ? 3 : 0}
              stroke="none"
              startAngle={90}
              endAngle={-270}
              isAnimationActive
              className="cursor-pointer outline-none"
              onClick={(slice: { status?: string }) => {
                if (slice.status === "Past due" || slice.status === "Not due") pick(slice.status);
              }}
            >
              {(total > 0 ? slices : [{ status: "none", color: "hsl(var(--muted))" }]).map((slice) => (
                <Cell
                  key={slice.status}
                  fill={slice.color}
                  fillOpacity={!selected || selected === slice.status ? 1 : 0.3}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
          <div className="text-sm font-semibold tabular-nums leading-none">
            {formatMoney(selected ? slices.find((slice) => slice.status === selected)?.value ?? 0 : total)}
          </div>
          <div className="mt-1 text-xs leading-none text-muted-foreground">
            {selected === "Not due" ? "Not Yet Due" : selected === "Past due" ? "Past Due" : "Total Unpaid"}
          </div>
        </div>
      </div>
      <div className="w-full space-y-1 sm:max-w-[13rem]">
        {slices.map((slice) => (
          <button
            key={slice.status}
            type="button"
            onClick={() => pick(slice.status)}
            aria-pressed={selected === slice.status}
            className={cn(
              "flex w-full items-start justify-between gap-3 text-left transition",
              selected && selected !== slice.status && "opacity-45"
            )}
          >
            <span className="flex items-center gap-1.5 text-sm text-foreground">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: slice.color }} />
              {slice.label}
            </span>
            <span className="text-right">
              <span className="block text-sm font-semibold tabular-nums" style={{ color: slice.color }}>
                {formatMoney(slice.value)}
              </span>
              <span className="block text-xs leading-tight text-muted-foreground">
                ({total ? `${((slice.value / total) * 100).toFixed(1)}%` : "—"})
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function CountyValueLabel({
  viewBox,
  value,
  parentViewBox,
}: {
  viewBox?: { x?: number; y?: number; width?: number; height?: number };
  value?: string | number;
  parentViewBox?: { x?: number; width?: number };
}) {
  if (!viewBox || value == null) return null;
  const y = (viewBox.y ?? 0) + (viewBox.height ?? 0) / 2;
  const x =
    parentViewBox?.x != null && parentViewBox.width != null
      ? parentViewBox.x + parentViewBox.width + 8
      : (viewBox.x ?? 0) + (viewBox.width ?? 0) + 8;
  return (
    <text x={x} y={y} dominantBaseline="central" fill="currentColor" fontSize={12}>
      {value}
    </text>
  );
}

export type CountyBar = { county: string; billed: number };

const COUNTY_PREVIEW = 8;

function countyBlue(index: number, count: number) {
  const t = count <= 1 ? 0 : index / (count - 1);
  const hue = 214 - t * 28;
  const lightness = 52 + t * 22;
  return `hsl(${hue} 100% ${lightness}%)`;
}

export function CountyChart({
  rows,
  selected,
  onToggle,
}: {
  rows: CountyBar[];
  selected: string[];
  onToggle: (county: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const sorted = useMemo(() => [...rows].sort((a, b) => b.billed - a.billed), [rows]);
  const total = sorted.reduce((sum, row) => sum + row.billed, 0);
  const visible = (showAll ? sorted : sorted.slice(0, COUNTY_PREVIEW)).map((row) => ({
    ...row,
    label: `${formatMoney(row.billed)} · ${percent(row.billed, total)}`,
  }));
  const hasSelection = selected.length > 0;

  if (!sorted.length) return null;

  return (
    <div>
      <div style={{ height: visible.length * 36 + 8 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={visible} layout="vertical" margin={{ top: 4, right: 168, left: 0, bottom: 4 }}>
            <XAxis type="number" hide domain={[0, "dataMax"]} />
            <YAxis
              type="category"
              dataKey="county"
              width={120}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }} />
            <Bar
              dataKey="billed"
              name="Billed"
              radius={[0, 4, 4, 0]}
              barSize={20}
              background={{ fill: "hsl(var(--muted))", radius: 4 }}
              className="cursor-pointer"
              onClick={(entry: { county?: string }) => entry.county && onToggle(entry.county)}
            >
              {visible.map((row, index) => (
                <Cell
                  key={row.county}
                  fill={countyBlue(index, visible.length)}
                  fillOpacity={!hasSelection || selected.includes(row.county) ? 1 : 0.35}
                />
              ))}
              <LabelList dataKey="label" content={<CountyValueLabel />} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>Click a county to filter the whole dashboard by it.</span>
        {sorted.length > COUNTY_PREVIEW ? (
          <button type="button" className="font-medium text-foreground hover:underline" onClick={() => setShowAll((v) => !v)}>
            {showAll ? "Show top counties" : `Show all ${sorted.length} counties`}
          </button>
        ) : null}
      </div>
    </div>
  );
}
