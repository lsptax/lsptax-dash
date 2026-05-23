"use client";

import { Clients } from "@/components/portal/clients/list/columns";
import { ColumnDef } from "@tanstack/react-table";



export const clientsColumn: ColumnDef<Clients>[] = [
  {
    accessorKey: "clientId",
    header: "Client #",
    cell: ({ row }) => {
      const id = row.original.clientNumber;
      return <div className="text-blue-400 font-bold">#{id}</div>;
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
