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
import type { InvoiceSummary } from "@/types/types";
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
};

function patchInvoicePaymentInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  ids: number[],
  nextPaid: boolean
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
      return {
        ...row,
        isPaid: nextPaid,
        paidCount: nextPaid ? invoiceCount : 0,
        invoiceCount,
      };
    });

    // Drop rows that no longer match the active payment filter.
    const paymentStatus = queryKey[6];
    const filtered =
      paymentStatus === "paid"
        ? nextData.filter((row) => row.isPaid)
        : paymentStatus === "unpaid"
          ? nextData.filter((row) => !row.isPaid)
          : nextData;

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
  const isPartial = paid > 0 && paid < total;

  const applyPaymentStatus = async (
    nextChecked: boolean,
    extras?: MarkInvoicePaidPayload
  ) => {
    if (!ids.length || saving) return;
    setSaving(true);

    const previous = queryClient.getQueriesData<PaginatedResponse<InvoiceSummary>>({
      queryKey: ["invoices"],
    });
    patchInvoicePaymentInCache(queryClient, ids, nextChecked);

    try {
      const result = await updateInvoicePaymentStatus({
        invoiceIds: ids,
        isPaid: nextChecked,
        ...(nextChecked
          ? {
              paidDate: extras?.paidDate,
              paymentNotes: extras?.paymentNotes,
              sendAcknowledgementEmail: extras?.sendAcknowledgementEmail ?? false,
            }
          : {}),
      });
      void queryClient.invalidateQueries({ queryKey: ["invoices"] });

      if (nextChecked) {
        toast({
          title: "Payment updated",
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
      await applyPaymentStatus(true, payload);
      setPaidDialogOpen(false);
    } catch {
      // Error toast already shown; keep dialog open for retry.
    }
  };

  return (
    <div onClick={(event) => event.stopPropagation()}>
      <Switch
        checked={fullyPaid}
        disabled={saving || ids.length === 0}
        onCheckedChange={handleToggle}
        aria-label={fullyPaid ? "Mark invoice unpaid" : "Mark invoice paid"}
        className={cn(isPartial && "data-[state=unchecked]:bg-green-300")}
      />
      <MarkInvoicePaidDialog
        open={paidDialogOpen}
        onOpenChange={setPaidDialogOpen}
        invoiceCount={ids.length}
        submitting={saving}
        onConfirm={handleConfirmPaid}
      />
    </div>
  );
}
