"use client";

import { ColumnDef } from "@tanstack/react-table";
import { routes } from "@/routes/ROUTES";
import { ClientActionsCell } from "./ClientActionsCell";
import { ListDetailLink } from "../../ListDetailLink";

export type Clients = {
  isArchived: boolean;
  clientId: string;
  clientNumber: string;
  clientName: string;
  email: string;
  type: string;
  mobile: string;
};

export const clientsColumn: ColumnDef<Clients>[] = [
  {
    accessorKey: "clientId",
    header: "Client #",
    cell: ({ row }) => {
      const clientId = row.original.clientId;
      const clientNumber = row.original.clientNumber ?? clientId;

      return (
        <ListDetailLink to={routes.client.detail(clientId)}>
          <div className="text-foreground font-semibold">#{clientNumber}</div>
        </ListDetailLink>
      );
    },
  },
  {
    accessorKey: "clientName",
    header: "Client Name",
    enableColumnFilter: true,
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "mobile",
    header: "Mobile",
  },
  {
    accessorKey: "type",
    header: "Type",
  },
  {
    accessorKey: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const { clientId, clientNumber, clientName, isArchived } = row.original;
      return (
        <ClientActionsCell
          clientNum={clientNumber}
          clientId={clientId}
          clientName={clientName}
          isArchived={isArchived}
        />
      );
    },
  },
];
