import DashboardStats from "./dashboard/DashboardStats";
import MiniTableContainer from "./dashboard/mini-tables/MiniTableContainer";
import { useDashboardDataQuery } from "@/hooks/queries";
import { Button } from "@/components/ui/button";
import { Properties } from "./properties/columns";
import { Clients } from "./clients/list/columns";
import { Prospect } from "@/types/types";
import { TableSkeleton } from "./TableSkeleton";
import { FeatureErrorBoundary } from "@/components/FeatureErrorBoundary";

const Dashboard = () => {
  const {
    stats,
    propData,
    clientData,
    prospectData,
    isLoading,
    isError,
    error,
    refetch,
  } = useDashboardDataQuery();

  if (isError) {
    return (
      <div className="flex flex-col justify-center items-center py-20 text-destructive gap-2">
        <span className="text-sm text-muted-foreground text-center max-w-md">
          {error instanceof Error ? error.message : "Failed to load dashboard"}
        </span>
        <Button variant="blue" className="mt-2" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col">
        <DashboardStats
          stats={{ numOfClients: 0, numOfProspects: 0, hearings: undefined }}
          loading={true}
        />
        <TableSkeleton rows={5} columns={4} />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <DashboardStats
        stats={stats}
        loading={false}
      />
      <FeatureErrorBoundary label="Dashboard tables">
        <MiniTableContainer
          prospectData={(prospectData ?? []) as Prospect[]}
          propData={(propData ?? []) as Properties[]}
          clientData={(clientData ?? []) as Clients[]}
        />
      </FeatureErrorBoundary>
    </div>
  );
};

export default Dashboard;
