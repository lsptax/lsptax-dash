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
import { invoiceStatusBadgeClass, labelFor, INVOICE_STATUSES } from "@/constants/classification";
import { paymentMethodLabel } from "@/constants/paymentMethod";

export function paymentMethodLabels(row: InvoiceSummary): string[] {
  return [
    ...new Set(
      (row.paidInvoices ?? [])
        .map((entry) => paymentMethodLabel(entry.paymentMethod))
        .filter(Boolean)
    ),
  ];
}

export function InvoiceStatusCell({ row }: { row: InvoiceSummary }) {
  const status = row.invoiceStatus || (row.isPaid ? "PAID" : "DRAFT");
  const methods = paymentMethodLabels(row);
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span
        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${invoiceStatusBadgeClass(status)}`}
      >
        {labelFor(INVOICE_STATUSES, status)}
      </span>
      {methods.map((method) => (
        <span
          key={method}
          className="inline-flex rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-medium text-sky-800 dark:bg-sky-400/15 dark:text-sky-300"
        >
          {method}
        </span>
      ))}
    </div>
  );
}

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
          <div className="text-foreground font-semibold">#{id}</div>
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
            className="font-semibold text-foreground hover:underline"
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
                className="bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300 p-1 m-1 font-semibold w-max border border-transparent dark:border-emerald-400/20 rounded-md text-xs"
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
    accessorKey: "invoiceStatus",
    header: "Invoice Status",
    cell: ({ row }) => <InvoiceStatusCell row={row.original} />,
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
        yearInvoices={row.original.yearInvoices}
        isArchived={row.original.isArchived}
      />
    ),
  },
];
