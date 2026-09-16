"use client";

import { Clients } from "@/components/portal/clients/list/columns";
import { ColumnDef } from "@tanstack/react-table";
import { formatClientNumberDisplay } from "@/utils/clientContact";

export const clientsColumn: ColumnDef<Clients>[] = [
  {
    accessorKey: "clientId",
    header: "Client #",
    cell: ({ row }) => {
      return (
        <div className="text-foreground font-semibold">
          {formatClientNumberDisplay(row.original.clientNumber)}
        </div>
      );
    },
  },
  {
    accessorKey: "clientName",
    header: "Client Name",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "mobile",
    header: "Mobile",
  },
];
