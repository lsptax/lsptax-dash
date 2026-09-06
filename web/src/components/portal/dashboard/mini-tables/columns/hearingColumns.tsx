import { ColumnDef } from "@tanstack/react-table";
import type { Hearing } from "@/types/hearings";
import { formatHearingDate, hearingStatusLabel, normalizeHearingStatus } from "@/constants/hearings";
import { NavLink } from "react-router-dom";
import { routes } from "@/routes/ROUTES";

export const hearingColumns: ColumnDef<Hearing>[] = [
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => (
      <div className="font-medium text-slate-900">{formatHearingDate(row.original.date)}</div>
    ),
  },
  {
    accessorKey: "accountNumber",
    header: "Account",
    cell: ({ row }) => (
      <NavLink
        to={routes.properties.view(row.original.propertyId)}
        className="text-indigo-700 hover:underline"
      >
        {row.original.accountNumber ?? "—"}
      </NavLink>
    ),
  },
  {
    accessorKey: "clientName",
    header: "Client",
    cell: ({ row }) => (
      <span className="text-slate-700">{row.original.clientName ?? "—"}</span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = normalizeHearingStatus(row.original.status);
      return <span className="text-xs text-slate-600">{hearingStatusLabel(status)}</span>;
    },
  },
];
