import type {
  InvoicePaymentStatusFilter,
  InvoiceSendStatusFilter,
} from "@/store/invoices";
import { INVOICE_EMAIL_FILTER } from "@/utils/invoiceEmailStatus";

export type InvoiceListParams = {
  search: string;
  sendStatus: InvoiceSendStatusFilter;
  paymentStatus: InvoicePaymentStatusFilter;
  offset: number;
  limit: number;
  archived: boolean;
};

const SEND_STATUS_VALUES = new Set<string>(Object.values(INVOICE_EMAIL_FILTER));
const PAYMENT_STATUS_VALUES = new Set<string>(["any", "paid", "unpaid"]);

export const DEFAULT_INVOICE_LIST_PARAMS: InvoiceListParams = {
  search: "",
  sendStatus: "all",
  paymentStatus: "any",
  offset: 0,
  limit: 10,
  archived: false,
};

export function parseInvoiceListParams(
  searchParams: URLSearchParams
): InvoiceListParams {
  const sendStatus = searchParams.get("sendStatus");
  const paymentStatus = searchParams.get("paymentStatus");
  const offset = Number(searchParams.get("offset") ?? "0");
  const limit = Number(searchParams.get("limit") ?? "10");

  return {
    search: searchParams.get("search") ?? "",
    sendStatus: SEND_STATUS_VALUES.has(sendStatus ?? "")
      ? (sendStatus as InvoiceSendStatusFilter)
      : DEFAULT_INVOICE_LIST_PARAMS.sendStatus,
    paymentStatus: PAYMENT_STATUS_VALUES.has(paymentStatus ?? "")
      ? (paymentStatus as InvoicePaymentStatusFilter)
      : DEFAULT_INVOICE_LIST_PARAMS.paymentStatus,
    offset: Number.isFinite(offset) && offset >= 0 ? offset : 0,
    limit: Number.isFinite(limit) && limit > 0 ? limit : 10,
    archived: searchParams.get("archived") === "true",
  };
}

export function invoiceListParamsToSearchParams(
  params: InvoiceListParams
): URLSearchParams {
  const usp = new URLSearchParams();
  if (params.search) usp.set("search", params.search);
  if (params.sendStatus !== DEFAULT_INVOICE_LIST_PARAMS.sendStatus) {
    usp.set("sendStatus", params.sendStatus);
  }
  if (params.paymentStatus !== DEFAULT_INVOICE_LIST_PARAMS.paymentStatus) {
    usp.set("paymentStatus", params.paymentStatus);
  }
  if (params.offset > 0) usp.set("offset", String(params.offset));
  if (params.limit !== DEFAULT_INVOICE_LIST_PARAMS.limit) {
    usp.set("limit", String(params.limit));
  }
  if (params.archived) usp.set("archived", "true");
  return usp;
}

export function mergeInvoiceListParams(
  current: URLSearchParams,
  updates: Partial<InvoiceListParams>
): URLSearchParams {
  return invoiceListParamsToSearchParams({
    ...parseInvoiceListParams(current),
    ...updates,
  });
}
