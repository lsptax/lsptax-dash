import React from "react";
import clientsLogo from "@/assets/dashboard/client-logo.svg";
import prospectLogo from "@/assets/dashboard/prospects-logo.svg";
import { NavLink } from "react-router-dom";
import { routes } from "@/routes/ROUTES";
import type { HearingStats } from "@/types/hearings";
import { Calendar, CalendarClock, CalendarDays } from "lucide-react";

interface Stats {
  numOfClients: number;
  numOfProspects: number;
  hearings?: HearingStats;
}

interface StatsCardConfig {
  label: string;
  icon: string | React.ReactNode;
  number: number | null;
  link: string;
  sublabel?: string;
}

interface StatsItemProps extends StatsCardConfig {
  loading: boolean;
}

const DashboardStats = ({
  stats,
  loading,
}: {
  stats: Stats;
  loading: boolean;
}) => {
  const hearingStats = stats.hearings;
  const weekRange =
    hearingStats?.weekStartDate && hearingStats?.weekEndDate
      ? `${new Date(`${hearingStats.weekStartDate}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${new Date(`${hearingStats.weekEndDate}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
      : hearingStats?.weekStart && hearingStats?.weekEnd
        ? `${new Date(hearingStats.weekStart).toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${new Date(hearingStats.weekEnd).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
        : undefined;

  const items: StatsCardConfig[] = [
    {
      label: "Active Clients",
      icon: clientsLogo,
      number: loading ? null : stats.numOfClients,
      link: routes.clients.list(),
    },
    {
      label: "New Prospects",
      icon: prospectLogo,
      number: loading ? null : stats.numOfProspects,
      link: routes.prospects.list(),
    },
    {
      label: "Meetings this week",
      icon: <CalendarDays className="h-9 w-9 text-primary" strokeWidth={1.5} />,
      number: loading ? null : (hearingStats?.meetingsThisWeek ?? 0),
      link: routes.hearings.list(),
      sublabel: weekRange ? `${weekRange}` : "Upcoming hearings",
    },
    {
      label: "Meetings today",
      icon: <CalendarClock className="h-9 w-9 text-amber-600 dark:text-amber-400" strokeWidth={1.5} />,
      number: loading ? null : (hearingStats?.meetingsToday ?? 0),
      link: routes.hearings.list(),
    },
    {
      label: "Total scheduled",
      icon: <Calendar className="h-9 w-9 text-emerald-600 dark:text-emerald-400" strokeWidth={1.5} />,
      number: loading ? null : (hearingStats?.totalScheduled ?? 0),
      link: routes.hearings.list(),
    },
  ];

  return (
    <div className="grid w-full grid-cols-1 gap-3 px-4 pt-3 sm:grid-cols-2 sm:px-5 lg:grid-cols-3 2xl:grid-cols-5">
      {items.map((item) => (
        <StatsItem key={item.label} {...item} loading={loading} />
      ))}
    </div>
  );
};

const StatsItem: React.FC<StatsItemProps> = ({
  label,
  icon,
  number,
  link,
  loading,
  sublabel,
}) => {
  const iconNode =
    typeof icon === "string" ? (
      <img src={icon} alt="" className={loading ? "opacity-30 grayscale" : ""} />
    ) : (
      <div className={loading ? "opacity-30 grayscale" : ""}>{icon}</div>
    );

  return (
    <div className="portal-card w-full min-w-0 flex justify-between transition-colors hover:border-primary/40 hover:bg-muted/40">
      <NavLink to={link} className="w-full">
        <div className="flex gap-4 px-5 py-4 rounded-xl justify-between items-center">
          <div>
            {loading ? (
              <div className="space-y-2">
                <div className="h-6 w-16 bg-muted rounded animate-pulse" />
                <div className="h-4 w-24 bg-muted/70 rounded animate-pulse" />
              </div>
            ) : (
              <>
                <p className="text-2xl font-semibold tabular-nums">{number}</p>
                <p className="text-sm text-muted-foreground">{label}</p>
                {sublabel ? <p className="text-xs text-muted-foreground mt-0.5">{sublabel}</p> : null}
              </>
            )}
          </div>
          <div>{iconNode}</div>
        </div>
      </NavLink>
    </div>
  );
};

export default DashboardStats;
