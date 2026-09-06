import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ChevronLeft, ChevronRight, History, LoaderCircle, Paperclip, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { InvoiceEmailStatusBadge } from "@/components/portal/invoices/InvoiceEmailStatusBadge";
import {
  getInvoiceDeliveryDownloadUrl,
  syncInvoiceDeliveryTracking,
  type InvoiceDelivery,
  type InvoiceStoredFile,
} from "@/store/invoices";
import type { InvoiceEmailTracking } from "@/utils/invoiceEmailStatus";
import { deliveryToEmailTracking } from "@/utils/invoiceEmailStatus";

type InvoiceSendHistoryProps = {
  deliveries: InvoiceDelivery[];
  loading?: boolean;
  selectedYear?: number;
  onRefresh?: () => void | Promise<void>;
};

function formatSentAt(value?: string | null): string {
  if (!value) return "—";
  try {
    return format(parseISO(value), "MMM d, yyyy");
  } catch {
    return new Date(value).toLocaleDateString();
  }
}

function statusLabel(status: string): string {
  const s = status.toUpperCase();
  if (s === "SENT") return "Sent";
  if (s === "FAILED") return "Failed";
  if (s === "SKIPPED") return "Skipped";
  return status;
}

function StatusPill({ label, status }: { label: string; status: string }) {
  const s = status.toUpperCase();
  return (
    <span
      className={cn(
        "inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium leading-none",
        s === "SENT" && "bg-emerald-100 text-emerald-800",
        s === "FAILED" && "bg-red-100 text-red-800",
        s !== "SENT" && s !== "FAILED" && "bg-slate-100 text-slate-600"
      )}
    >
      {label} · {statusLabel(status)}
    </span>
  );
}

function getDeliveryTracking(delivery: InvoiceDelivery): InvoiceEmailTracking | null {
  return deliveryToEmailTracking(delivery);
}

function getDownloadableFiles(delivery: InvoiceDelivery): InvoiceStoredFile[] {
  return (delivery.storedFiles ?? []).filter(
    (file) => file.storagePath?.trim() && file.filename?.trim()
  );
}

function DeliveryItem({
  delivery,
  selectedYear,
  downloadingKey,
  syncingId,
  onDownload,
  onSyncTracking,
}: {
  delivery: InvoiceDelivery;
  selectedYear?: number;
  downloadingKey: string | null;
  syncingId: number | null;
  onDownload: (deliveryId: number, fileIndex: number, filename: string) => void;
  onSyncTracking: (deliveryId: number) => void;
}) {
  const isSelectedYear = selectedYear != null && delivery.year === selectedYear;
  const downloadableFiles = getDownloadableFiles(delivery);
  const emailTracking = getDeliveryTracking(delivery);
  const canSync =
    delivery.emailStatus?.toUpperCase() === "SENT" &&
    Boolean(delivery.brevoEmailMessageId?.trim());

  return (
    <li
      className={cn(
        "rounded-md border border-slate-200 bg-white px-2.5 py-2",
        isSelectedYear && "border-brand-blue/30 bg-blue-50/50"
      )}
    >
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className={cn("font-semibold", isSelectedYear ? "text-brand-blue" : "text-slate-800")}>
          {delivery.year}
        </span>
        <span className="shrink-0 text-slate-500">
          {formatSentAt(delivery.emailSentAt ?? delivery.createdAt)}
        </span>
      </div>
      <p className="mt-1 truncate text-[11px] text-slate-600" title={delivery.recipientEmail}>
        {delivery.recipientEmail}
      </p>
      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        {emailTracking ? (
          <InvoiceEmailStatusBadge lastDelivery={emailTracking} className="rounded px-1.5 py-0.5 text-[10px]" />
        ) : (
          <StatusPill label="Email" status={delivery.emailStatus} />
        )}
        <StatusPill label="SMS" status={delivery.smsStatus} />
        {canSync && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-5 px-1.5 text-[10px]"
            disabled={syncingId === delivery.id}
            onClick={() => onSyncTracking(delivery.id)}
            title="Refresh Brevo tracking for this send"
          >
            {syncingId === delivery.id ? (
              <LoaderCircle className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
          </Button>
        )}
      </div>
      {downloadableFiles.length > 0 && (
        <ul className="mt-1.5 space-y-1 border-t border-slate-100 pt-1.5">
          {(delivery.storedFiles ?? []).map((file, fileIndex) => {
            if (!file.storagePath?.trim() || !file.filename?.trim()) return null;
            const key = `${delivery.id}-${fileIndex}`;
            const isDownloading = downloadingKey === key;
            return (
              <li key={key}>
                <button
                  type="button"
                  className="flex w-full min-w-0 items-center gap-1 text-left text-[10px] text-brand-blue hover:underline disabled:opacity-60"
                  disabled={isDownloading}
                  title={`Download ${file.filename}`}
                  onClick={() => onDownload(delivery.id, fileIndex, file.filename)}
                >
                  {isDownloading ? (
                    <LoaderCircle className="h-3 w-3 shrink-0 animate-spin" />
                  ) : (
                    <Paperclip className="h-3 w-3 shrink-0" />
                  )}
                  <span className="truncate">{file.filename}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {delivery.errorMessage && (
        <p className="mt-1 line-clamp-2 text-[10px] text-red-600">{delivery.errorMessage}</p>
      )}
    </li>
  );
}

export default function InvoiceSendHistory({
  deliveries,
  loading = false,
  selectedYear,
  onRefresh,
}: InvoiceSendHistoryProps) {
  const [open, setOpen] = useState(false);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const { toast } = useToast();

  const handleDownload = async (deliveryId: number, fileIndex: number, filename: string) => {
    const key = `${deliveryId}-${fileIndex}`;
    setDownloadingKey(key);
    try {
      const { url } = await getInvoiceDeliveryDownloadUrl(deliveryId, fileIndex);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : `Could not download ${filename}`,
        variant: "destructive",
      });
    } finally {
      setDownloadingKey(null);
    }
  };

  const handleSyncTracking = async (deliveryId: number) => {
    setSyncingId(deliveryId);
    try {
      await syncInvoiceDeliveryTracking(deliveryId);
      await onRefresh?.();
      toast({
        title: "Tracking updated",
        description: "Latest Brevo email status loaded.",
      });
    } catch (error) {
      toast({
        title: "Sync failed",
        description: error instanceof Error ? error.message : "Could not refresh tracking.",
        variant: "destructive",
      });
    } finally {
      setSyncingId(null);
    }
  };

  if (!loading && deliveries.length === 0) {
    return null;
  }

  return (
    <aside
      className={cn(
        "shrink-0 transition-[width] duration-200 ease-out",
        open ? "w-full lg:w-[240px]" : "w-10 lg:w-11"
      )}
    >
      {!open ? (
        <Button
          type="button"
          variant="outline"
          className="relative flex h-auto w-10 flex-col items-center gap-1 rounded-lg border-slate-200 bg-white px-0 py-3 shadow-sm hover:bg-slate-50 lg:w-11"
          onClick={() => setOpen(true)}
          title="Show send history"
        >
          <History className="h-4 w-4 text-brand-blue" />
          {!loading && deliveries.length > 0 && (
            <Badge
              variant="secondary"
              className="h-4 min-w-4 px-1 text-[10px] leading-none"
            >
              {deliveries.length}
            </Badge>
          )}
          {loading && <LoaderCircle className="h-3 w-3 animate-spin text-slate-400" />}
          <ChevronLeft className="hidden h-3 w-3 text-slate-400 lg:block" />
        </Button>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-2 border-b bg-slate-50 px-2.5 py-2">
            <div className="flex min-w-0 items-center gap-1.5">
              <History className="h-3.5 w-3.5 shrink-0 text-brand-blue" />
              <span className="truncate text-xs font-semibold text-slate-900">Send history</span>
              {!loading && (
                <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                  {deliveries.length}
                </Badge>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              {onRefresh && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  disabled={loading}
                  onClick={() => void onRefresh()}
                  title="Refresh delivery history"
                >
                  {loading ? (
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 w-6 shrink-0 p-0"
                onClick={() => setOpen(false)}
                title="Collapse"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="max-h-[min(70vh,520px)] overflow-y-auto p-2">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                Loading…
              </div>
            ) : (
              <ul className="space-y-2">
                {deliveries.map((delivery) => (
                  <DeliveryItem
                    key={delivery.id}
                    delivery={delivery}
                    selectedYear={selectedYear}
                    downloadingKey={downloadingKey}
                    syncingId={syncingId}
                    onDownload={handleDownload}
                    onSyncTracking={handleSyncTracking}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
