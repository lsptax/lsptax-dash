"use client";

import { ColumnDef } from "@tanstack/react-table";
import { InvoiceSummary } from "@/types/types";
import formatDate from "@/utils/formatDate";
import { NavLink } from "react-router-dom";
import { routes } from "@/routes/ROUTES";
import { formatUSD } from "@/utils/formatCurrency";
import { InvoiceActionsCell } from "./InvoiceActionsCell";

export const invoicesColumn: ColumnDef<InvoiceSummary>[] = [
  {
    accessorKey: "id",
    header: "Invoice #",
    cell: ({ row }) => {
      const id = row.original.id;
      return (
        <NavLink to={routes.invoices.byClient(id)}>
          <div className="text-blue-400 font-bold">#{id}</div>
        </NavLink>
      );
    },
  },
  {
    accessorKey: "property",
    header: "Property Account Number",
    cell: ({ row }) => {
      return (
        <div>
          <div className="flex flex-wrap">
            {row.original?.propertyNumbers?.map((property, index) => (
              <h1
                key={index}
                className="bg-green-200 p-1 m-1 text-green-800 font-bold w-max border rounded-xl"
              >
                {property}
              </h1>
            ))}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => (
      <div className="font-bold">{formatUSD(row.original.totalInvoiceAmount)}</div>
    ),
  },
  {
    accessorKey: "addedOn",
    header: "Added/Sent On",
    cell: ({ row }) => {
      const addedOn = row.original.createdAt;
      return <div>{formatDate(addedOn)}</div>;
    },
  },
  {
    accessorKey: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <InvoiceActionsCell
        id={row.original.id}
        isArchived={row.original.isArchived}
      />
    ),
  },
];
