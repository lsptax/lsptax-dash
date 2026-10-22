import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { updateInvoicePaymentStatus } from "@/store/invoices";
import {
  describePaymentAcknowledgementIssues,
  hasPaymentAcknowledgementIssues,
} from "@/utils/paymentAcknowledgementEmail";
import { cn } from "@/lib/utils";
import type { PaymentMethod } from "@/constants/paymentMethod";
import type { InvoiceSummary, PaidInvoiceDetail } from "@/types/types";
import { InvoicePaidDetailsButton } from "./InvoicePaidDetailsButton";
import type { PaginatedResponse } from "@/store/common";
import {
  MarkInvoicePaidDialog,
  type MarkInvoicePaidPayload,
} from "./MarkInvoicePaidDialog";

type InvoicePaidCellProps = {
  invoiceId: string | number;
  invoiceIds?: Array<string | number>;
  isPaid?: boolean;
  paidCount?: number;
  invoiceCount?: number;
  invoiceAmount?: number | null;
  amountAlreadyPaid?: number | null;
  paidInvoices?: PaidInvoiceDetail[];
};

function patchInvoicePaymentInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  ids: number[],
  nextPaid: boolean,
  paymentMethod?: PaymentMethod | null,
  partial?: { amountPaid: number; alreadyPaid: number }
) {
  const idSet = new Set(ids);
  const queries = queryClient.getQueriesData<PaginatedResponse<InvoiceSummary>>({
    queryKey: ["invoices"],
  });

  for (const [queryKey, page] of queries) {
    if (!page?.data?.length) continue;

    const nextData = page.data.map((row) => {
      const rowIds = (row.invoiceIds?.length ? row.invoiceIds : [row.id])
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id));
      if (!rowIds.some((id) => idSet.has(id))) return row;

      const invoiceCount = row.invoiceCount ?? rowIds.length;
      const existingPaid = row.paidInvoices?.length
        ? row.paidInvoices
        : rowIds.map(
            (id): PaidInvoiceDetail => ({
              id,
              year: 0,
              invoiceAmount: 0,
            })
          );
      const partialAmount = partial
        ? Math.round(((partial.alreadyPaid || 0) + partial.amountPaid) * 100) / 100
        : 0;
      const paidInvoices: PaidInvoiceDetail[] = nextPaid
        ? existingPaid.map((entry) => ({
            ...entry,
            partial: false,
            paymentMethod: paymentMethod ?? entry.paymentMethod ?? null,
          }))
        : partial
          ? existingPaid.map((entry) => ({
              ...entry,
              partial: true,
              amountPaid: partialAmount,
              paymentMethod: paymentMethod ?? entry.paymentMethod ?? null,
            }))
          : [];
      return {
        ...row,
        isPaid: nextPaid,
        invoiceStatus: nextPaid ? "PAID" : row.invoiceStatus,
        paidCount: nextPaid ? invoiceCount : 0,
        partialAmount: nextPaid ? 0 : partialAmount,
        invoiceCount,
        paidInvoices,
      };
    });

    // Drop rows that no longer match the active payment filter.
    const paymentStatus = queryKey[6];
    const methodFilter = queryKey[11];
    const statusFiltered =
      paymentStatus === "paid"
        ? nextData.filter((row) => row.isPaid)
        : paymentStatus === "unpaid"
          ? nextData.filter((row) => !row.isPaid)
          : nextData;
    const filtered =
      typeof methodFilter === "string" && methodFilter !== "any"
        ? statusFiltered.filter((row) => {
            const rowIds = (row.invoiceIds?.length ? row.invoiceIds : [row.id])
              .map((id) => Number(id))
              .filter((id) => Number.isFinite(id));
            if (!rowIds.some((id) => idSet.has(id))) return true;
            return (nextPaid || Boolean(partial)) && paymentMethod === methodFilter;
          })
        : statusFiltered;

    queryClient.setQueryData(queryKey, {
      ...page,
      data: filtered,
      total:
        typeof page.total === "number"
          ? Math.max(0, page.total - (page.data.length - filtered.length))
          : page.total,
    });
  }
}

export function InvoicePaidCell({
  invoiceId,
  invoiceIds,
  isPaid = false,
  paidCount,
  invoiceCount,
  invoiceAmount = null,
  amountAlreadyPaid = 0,
  paidInvoices,
}: InvoicePaidCellProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [paidDialogOpen, setPaidDialogOpen] = useState(false);

  const ids = (invoiceIds?.length ? invoiceIds : [invoiceId])
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id));

  const total = invoiceCount ?? ids.length;
  const paid = paidCount ?? (isPaid ? total : 0);
  const fullyPaid = total > 0 && paid === total;
  const recordedPartial = (Number(amountAlreadyPaid) || 0) > 0;
  const isPartial = (paid > 0 && paid < total) || (!fullyPaid && recordedPartial);

  const applyPaymentStatus = async (
    nextChecked: boolean,
    extras?: MarkInvoicePaidPayload
  ) => {
    if (!ids.length || saving) return;
    setSaving(true);

    const previous = queryClient.getQueriesData<PaginatedResponse<InvoiceSummary>>({
      queryKey: ["invoices"],
    });
    const recordingPartial = Boolean(extras?.partial) && !nextChecked;
    patchInvoicePaymentInCache(
      queryClient,
      ids,
      nextChecked,
      extras?.paymentMethod,
      recordingPartial
        ? { amountPaid: Number(extras?.amountPaid) || 0, alreadyPaid: Number(amountAlreadyPaid) || 0 }
        : undefined
    );

    try {
      const result = await updateInvoicePaymentStatus({
        invoiceIds: ids,
        isPaid: nextChecked,
        ...(nextChecked || recordingPartial
          ? {
              paidDate: extras?.paidDate,
              paymentMethod: extras?.paymentMethod,
              paymentNotes: extras?.paymentNotes,
              amountPaid: recordingPartial ? extras?.amountPaid : undefined,
              sendAcknowledgementEmail: extras?.sendAcknowledgementEmail ?? false,
              templateKey: extras?.templateKey,
            }
          : {}),
      });
      void queryClient.invalidateQueries({ queryKey: ["invoices"] });

      if (nextChecked || recordingPartial) {
        toast({
          title: result.data.partial ? "Partial payment recorded" : "Payment updated",
          description: result.message,
        });
        const ack = result.data.acknowledgementEmail;
        if (hasPaymentAcknowledgementIssues(ack)) {
          toast({
            variant: "destructive",
            title: "Acknowledgement email issues",
            description: describePaymentAcknowledgementIssues(ack!),
          });
        }
      }
    } catch (error) {
      for (const [queryKey, page] of previous) {
        queryClient.setQueryData(queryKey, page);
      }
      toast({
        variant: "destructive",
        title: "Could not update payment status",
        description: error instanceof Error ? error.message : "Please try again.",
      });
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (nextChecked: boolean) => {
    if (!ids.length || saving) return;

    if (nextChecked) {
      setPaidDialogOpen(true);
      return;
    }

    void applyPaymentStatus(false);
  };

  const handleConfirmPaid = async (payload: MarkInvoicePaidPayload) => {
    try {
      await applyPaymentStatus(!payload.partial, payload);
      setPaidDialogOpen(false);
    } catch {
      // Error toast already shown; keep dialog open for retry.
    }
  };

  return (
    <div className="flex items-center gap-0.5" onClick={(event) => event.stopPropagation()}>
      <Switch
        checked={fullyPaid}
        disabled={saving || ids.length === 0}
        onCheckedChange={handleToggle}
        aria-label={
          fullyPaid ? "Mark invoice unpaid" : isPartial ? "Record another payment" : "Mark invoice paid"
        }
        className={cn(isPartial && "data-[state=unchecked]:bg-green-300")}
      />
      <InvoicePaidDetailsButton
        paidInvoices={paidInvoices}
        paidCount={paid}
        clearing={saving}
        onClear={
          !fullyPaid && recordedPartial && ids.length === 1
            ? () => void applyPaymentStatus(false)
            : undefined
        }
      />
      <MarkInvoicePaidDialog
        open={paidDialogOpen}
        onOpenChange={setPaidDialogOpen}
        invoiceCount={ids.length}
        invoiceAmount={ids.length === 1 ? invoiceAmount : null}
        amountAlreadyPaid={ids.length === 1 ? amountAlreadyPaid : 0}
        submitting={saving}
        onConfirm={handleConfirmPaid}
      />
    </div>
  );
}
