"use client";

import { ColumnDef } from "@tanstack/react-table";
import { NavLink } from "react-router-dom";
import { routes } from "@/routes/ROUTES";
import type { Hearing } from "@/types/hearings";
import { HearingStatusCell } from "./HearingStatusCell";
import { HearingDeleteButton } from "./HearingDeleteButton";
import { formatHearingDate, hearingStatusLabel, normalizeHearingStatus } from "@/constants/hearings";
import formatDate from "@/utils/formatDate";

export function createHearingsColumns(onUpdated: () => void): ColumnDef<Hearing>[] {
  return [
    {
      accessorKey: "date",
      header: "Hearing date",
      cell: ({ row }) => (
        <div className="font-medium text-slate-900">{formatHearingDate(row.original.date)}</div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <HearingStatusCell
          hearingId={row.original.id}
          status={row.original.status}
          onSuccess={onUpdated}
        />
      ),
    },
    {
      id: "client",
      header: "Client",
      cell: ({ row }) => {
        const clientId = row.original.clientId;
        const label = row.original.clientName ?? "—";
        const number = row.original.clientNumber;
        if (!clientId) return <span>{label}</span>;
        return (
          <div>
            <NavLink to={routes.client.detail(clientId)} className="text-blue-600 font-semibold hover:underline">
              {label}
            </NavLink>
            {number ? <div className="text-xs text-muted-foreground">#{number}</div> : null}
          </div>
        );
      },
    },
    {
      id: "property",
      header: "Property",
      cell: ({ row }) => {
        const account = row.original.accountNumber ?? "—";
        const address = row.original.propertyAddress;
        return (
          <div>
            <NavLink
              to={routes.properties.view(row.original.propertyId)}
              className="text-emerald-700 font-semibold hover:underline"
            >
              #{account}
            </NavLink>
            {address ? <div className="text-xs text-muted-foreground mt-0.5">{address}</div> : null}
          </div>
        );
      },
    },
    {
      accessorKey: "notes",
      header: "Notes",
      cell: ({ row }) => (
        <span className="text-sm text-slate-700">{row.original.notes?.trim() || "—"}</span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Added",
      cell: ({ row }) => {
        const at = row.original.createdAt;
        return <span className="text-sm text-slate-600">{at ? formatDate(at) : "—"}</span>;
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <HearingDeleteButton hearingId={row.original.id} onSuccess={onUpdated} variant="button" />
      ),
    },
  ];
}

/** Read-only status badge (e.g. property lifecycle list). */
export function HearingStatusBadge({ status: raw }: { status?: string }) {
  const status = normalizeHearingStatus(raw);
  return (
    <span className="inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
      {hearingStatusLabel(status)}
    </span>
  );
}
