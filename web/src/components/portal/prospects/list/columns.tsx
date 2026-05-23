"use client";

import { ColumnDef } from "@tanstack/react-table";
import { NavLink } from "react-router-dom";
import { routes } from "@/routes/ROUTES";
import { Prospect } from "@/types/types";
import { ProspectStatusCell } from "./ProspectStatusCell";
import { ProspectActionsCell } from "./ProspectActionsCell";

function getProspectDisplayName(row: Prospect | Record<string, unknown>): string {
  const r = row as Record<string, unknown>;
  return (r.clientName as string) ?? (r.prospectName as string) ?? (r.name as string) ?? "";
}

function getProspectPhone(row: Prospect | Record<string, unknown>): string {
  const r = row as Record<string, unknown>;
  return (r.phoneNumber as string) ?? (r.PHONENUMBER as string) ?? (r.phone as string) ?? (r.mobile as string) ?? "";
}

export function getProspectColumns(refetch: () => void | Promise<void>): ColumnDef<Prospect, unknown>[] {
  return [
    {
      accessorKey: "id",
      header: "Prospect #",
      cell: ({ row }) => {
        const prospectId = row.original.id;
        return (
          <NavLink to={routes.prospect.detail(prospectId)}>
            <div className="text-blue-400 font-bold">#{prospectId}</div>
          </NavLink>
        );
      },
    },
    {
      id: "prospectName",
      header: "Prospect Name",
      accessorFn: (row) => getProspectDisplayName(row),
    },
    {
      id: "inquiryDate",
      header: "Inquiry Date",
      accessorFn: (row) => {
        if (!row.inquireDate) return "";
        const d = new Date(row.inquireDate);
        return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString();
      },
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      id: "phone",
      header: "Mobile",
      accessorFn: (row) => getProspectPhone(row),
    },
    {
      accessorKey: "status",
      header: "Status",
      id: "status",
      cell: ({ row }) => (
        <ProspectStatusCell prospect={row.original} onSuccess={refetch} />
      ),
    },
    {
      header: "Actions",
      id: "actions",
      cell: ({ row }) => (
        <ProspectActionsCell prospect={row.original} onSuccess={refetch} />
      ),
    },
  ];
}
