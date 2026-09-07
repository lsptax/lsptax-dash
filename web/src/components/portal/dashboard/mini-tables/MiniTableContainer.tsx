import { Clients } from "../../clients/list/columns";
import { Properties } from "../../properties/columns";
import { Prospect } from "@/types/types";
import type { Hearing } from "@/types/hearings";
import DonutChart from "../Chart";
import MiniTableBuilder from "./MiniTableBuilder";
import { clientsColumn } from "./columns/clientColumns";
import { propertiesColumn } from "./columns/propColumns";
import { prospectColumn } from "./columns/prospectColumns";
import { hearingColumns } from "./columns/hearingColumns";
import { routes } from "@/routes/ROUTES";

type MiniTableContainerProps = {
  propData: Properties[];
  clientData: Clients[];
  prospectData: Prospect[];
  hearingsThisWeek?: Hearing[];
};

const MiniTableContainer = ({
  propData,
  clientData,
  prospectData,
  hearingsThisWeek = [],
}: MiniTableContainerProps) => {
  return (
    <div className="px-4 sm:px-5 pt-3 pb-5 grid grid-cols-1 xl:grid-cols-2 gap-3">
      <DonutChart />
      <MiniTableBuilder<Hearing>
        data={hearingsThisWeek}
        columns={hearingColumns as import("@tanstack/react-table").ColumnDef<Hearing, any>[]}
        label="Meetings this week"
        link={routes.hearings.list()}
      />
      <MiniTableBuilder<Prospect>
        data={prospectData}
        columns={prospectColumn as import("@tanstack/react-table").ColumnDef<Prospect, any>[]}
        label="Prospects"
        link={routes.prospects.list()}
      />
      <MiniTableBuilder<Properties>
        data={propData}
        columns={propertiesColumn as import("@tanstack/react-table").ColumnDef<Properties, any>[]}
        label="Properties"
        link={routes.properties.list()}
      />
      <MiniTableBuilder<Clients>
        data={clientData}
        columns={clientsColumn as import("@tanstack/react-table").ColumnDef<Clients, any>[]}
        label="Clients"
        link={routes.clients.list()}
      />
    </div>
  );
};

export default MiniTableContainer;
