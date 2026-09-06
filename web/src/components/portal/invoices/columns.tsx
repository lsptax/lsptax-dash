"use client";

import { ColumnDef } from "@tanstack/react-table";
import { InvoiceSummary } from "@/types/types";
import formatDate from "@/utils/formatDate";
import { routes } from "@/routes/ROUTES";
import { ListDetailLink } from "../ListDetailLink";
import { formatUSD } from "@/utils/formatCurrency";
import { InvoiceActionsCell } from "./InvoiceActionsCell";
import { InvoiceEmailStatusBadge } from "./InvoiceEmailStatusBadge";
import { InvoicePaidCell } from "./InvoicePaidCell";
import { InvoicePaidDetailsButton } from "./InvoicePaidDetailsButton";

export const invoicesColumn: ColumnDef<InvoiceSummary>[] = [
  {
    accessorKey: "id",
    header: "Invoice #",
    cell: ({ row }) => {
      const id = row.original.id;
      const propertyId = row.original.propertyId;
      const invoiceLink = propertyId
        ? routes.invoices.byProperty(propertyId)
        : routes.invoices.byClient(row.original.clientId);
      return (
        <ListDetailLink to={invoiceLink}>
          <div className="text-blue-400 font-bold">#{id}</div>
        </ListDetailLink>
      );
    },
  },
  {
    accessorKey: "clientName",
    header: "Client",
    cell: ({ row }) => {
      const clientId = row.original.clientId;
      const label = row.original.clientName?.trim() || "—";
      const number = row.original.clientNumber;
      if (!clientId) return <span>{label}</span>;
      return (
        <div>
          <ListDetailLink
            to={routes.client.detail(clientId)}
            className="font-semibold text-blue-600 hover:underline"
          >
            {label}
          </ListDetailLink>
          {number ? (
            <div className="text-xs text-muted-foreground">#{number}</div>
          ) : null}
        </div>
      );
    },
  },
  {
    accessorKey: "property",
    header: "Property Account Number",
    cell: ({ row }) => {
      const propertyNumbers = row.original?.propertyNumbers?.length
        ? row.original.propertyNumbers
        : row.original.propertyNumber
          ? [row.original.propertyNumber]
          : [];

      return (
        <div>
          <div className="flex flex-wrap">
            {propertyNumbers.map((property, index) => (
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
    accessorKey: "isPaid",
    header: "Paid",
    cell: ({ row }) => (
      <div className="flex items-center gap-0.5">
        <InvoicePaidCell
          invoiceId={row.original.id}
          invoiceIds={row.original.invoiceIds}
          isPaid={row.original.isPaid}
          paidCount={row.original.paidCount}
          invoiceCount={row.original.invoiceCount}
        />
        <InvoicePaidDetailsButton
          paidInvoices={row.original.paidInvoices}
          paidCount={row.original.paidCount}
        />
      </div>
    ),
  },
  {
    accessorKey: "lastDelivery",
    header: "Status",
    cell: ({ row }) => (
      <InvoiceEmailStatusBadge lastDelivery={row.original.lastDelivery} />
    ),
  },
  {
    accessorKey: "updatedAt",
    header: "Edited On",
    cell: ({ row }) => {
      const editedOn = row.original.updatedAt;
      return <div>{formatDate(editedOn)}</div>;
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
