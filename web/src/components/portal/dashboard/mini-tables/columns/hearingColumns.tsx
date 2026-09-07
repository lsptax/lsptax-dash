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
      <div className="font-medium text-foreground">{formatHearingDate(row.original.date)}</div>
    ),
  },
  {
    accessorKey: "accountNumber",
    header: "Account",
    cell: ({ row }) => (
      <NavLink
        to={routes.properties.view(row.original.propertyId)}
        className="text-primary hover:underline"
      >
        {row.original.accountNumber ?? "—"}
      </NavLink>
    ),
  },
  {
    accessorKey: "clientName",
    header: "Client",
    cell: ({ row }) => (
      <span className="text-foreground">{row.original.clientName ?? "—"}</span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = normalizeHearingStatus(row.original.status);
      return <span className="text-xs text-muted-foreground">{hearingStatusLabel(status)}</span>;
    },
  },
];
