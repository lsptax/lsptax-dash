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
    hearingStats?.weekStart && hearingStats?.weekEnd
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
      icon: <CalendarDays className="h-10 w-10 text-indigo-600" strokeWidth={1.5} />,
      number: loading ? null : (hearingStats?.meetingsThisWeek ?? 0),
      link: routes.hearings.list(),
      sublabel: weekRange ? `Week of ${weekRange}` : "Upcoming hearings",
    },
    {
      label: "Meetings today",
      icon: <CalendarClock className="h-10 w-10 text-amber-600" strokeWidth={1.5} />,
      number: loading ? null : (hearingStats?.meetingsToday ?? 0),
      link: routes.hearings.list(),
    },
    {
      label: "Total scheduled",
      icon: <Calendar className="h-10 w-10 text-emerald-600" strokeWidth={1.5} />,
      number: loading ? null : (hearingStats?.totalScheduled ?? 0),
      link: routes.hearings.list(),
    },
  ];

  return (
    <div className="flex w-full">
      <div className="flex gap-2 m-2 flex-col md:flex-row w-full flex-wrap">
        {items.map((item) => (
          <StatsItem key={item.label} {...item} loading={loading} />
        ))}
      </div>
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
    <div className="bg-white w-full min-w-[10rem] flex-1 flex border rounded-xl justify-between">
      <NavLink to={link} className="w-full">
        <div className="flex md:flex-row gap-4 p-4 rounded-xl justify-between items-center">
          <div>
            {loading ? (
              <div className="space-y-2">
                <div className="h-6 w-16 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-bold">{number}</h2>
                <h1 className="text-sm">{label}</h1>
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
