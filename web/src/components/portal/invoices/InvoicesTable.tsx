import { useMemo, useRef, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { downloadInvoicesCSV } from "@/store/data";
import { MAX_API_PAGE_SIZE } from "@/store/common";
import TableBuilder from "../TableBuilder";
import {
  Archive,
  CheckCircle2,
  ChevronDown,
  Download,
  FileArchive,
  LoaderCircle,
  Mail,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { useInvoicesQuery } from "@/hooks/queries";
import { TableSkeleton } from "../TableSkeleton";
import { routes } from "@/routes/ROUTES";
import { BulkInvoiceSendDialog } from "./BulkInvoiceSendDialog";
import { InvoicePdfRenderSheets } from "./InvoicePdfRenderSheets";
import {
  MarkInvoicePaidDialog,
  type MarkInvoicePaidPayload,
} from "./MarkInvoicePaidDialog";
import type { InvoiceSummary } from "@/types/types";
import { useToast } from "@/hooks/use-toast";
import {
  getBulkInvoiceRecipients,
  syncAllInvoiceDeliveriesFromBrevo,
  updateInvoicePaymentStatus,
} from "@/store/invoices";
import {
  describePaymentAcknowledgementIssues,
  hasPaymentAcknowledgementIssues,
} from "@/utils/paymentAcknowledgementEmail";
import type {
  InvoicePaymentStatusFilter,
  InvoiceSendStatusFilter,
} from "@/store/invoices";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  INVOICE_EMAIL_FILTER_OPTIONS,
} from "@/utils/invoiceEmailStatus";
import {
  mergeInvoiceListParams,
  parseInvoiceListParams,
} from "./invoiceListSearchParams";
import { useDraftSearch, useListSearchParams } from "@/hooks/useListSearchParams";
import {
  buildRenderJobsForRecipients,
  downloadInvoicePdfsAsZip,
  MAX_BULK_INVOICE_DOWNLOAD,
  nextFrame,
  resolveInvoiceListRange,
  type InvoicePdfRenderJob,
} from "@/utils/bulkInvoicePdf";

interface InvoicesTableProps {
  columns: ColumnDef<InvoiceSummary>[];
}

const InvoicesTable = ({
  columns,
}: InvoicesTableProps) => {
  const { toast } = useToast();
  const sheetRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const { params, updateParams } = useListSearchParams(
    parseInvoiceListParams,
    mergeInvoiceListParams
  );
  const {
    search: appliedSearch,
    sendStatus,
    paymentStatus,
    offset,
    limit,
    archived,
  } = params;
  const { searchTerm, setSearchTerm, commitSearch, clearSearch } = useDraftSearch(
    appliedSearch,
    (value) => updateParams({ search: value, offset: 0 })
  );
  const [downloadingCsv, setDownloadingCsv] = useState(false);
  const [downloadingPdfs, setDownloadingPdfs] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ completed: number; total: number } | null>(null);
  const [renderJobs, setRenderJobs] = useState<InvoicePdfRenderJob[]>([]);
  const [syncingBrevo, setSyncingBrevo] = useState(false);
  const [brevoSyncProgress, setBrevoSyncProgress] = useState<string | null>(null);
  const [bulkSendOpen, setBulkSendOpen] = useState(false);
  const [markPaidDialogOpen, setMarkPaidDialogOpen] = useState(false);
  const [markPaidInvoiceIds, setMarkPaidInvoiceIds] = useState<number[]>([]);
  const [resolvingMarkPaid, setResolvingMarkPaid] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<number>>(new Set());

  const { data, isLoading, isError, refetch } = useInvoicesQuery({
    limit,
    offset,
    search: appliedSearch,
    archived,
    sendStatus,
    paymentStatus,
  });

  const invoices = (data?.data ?? []) as InvoiceSummary[];
  const total = data?.total ?? 0;
  const hasMore = data?.hasMore ?? false;
  /** API caps page size at 100 even if the UI requests more (e.g. 300). */
  const effectiveLimit = data?.limit ?? Math.min(limit, MAX_API_PAGE_SIZE);
  const currentPageInvoiceIds = useMemo(
    () =>
      invoices
        .map((invoice) => Number(invoice.id))
        .filter((id) => Number.isFinite(id)),
    [invoices]
  );
  const selectedInvoiceIdList = useMemo(
    () => Array.from(selectedInvoiceIds),
    [selectedInvoiceIds]
  );
  const currentPageSelectedCount = currentPageInvoiceIds.filter((id) =>
    selectedInvoiceIds.has(id)
  ).length;
  const allCurrentPageSelected =
    currentPageInvoiceIds.length > 0 &&
    currentPageSelectedCount === currentPageInvoiceIds.length;

  const toggleInvoiceSelection = (invoiceId: string | number, checked: boolean) => {
    const numericId = Number(invoiceId);
    if (!Number.isFinite(numericId)) return;

    setSelectedInvoiceIds((current) => {
      const next = new Set(current);
      if (checked) next.add(numericId);
      else next.delete(numericId);
      return next;
    });
  };

  const toggleCurrentPageSelection = (checked: boolean) => {
    setSelectedInvoiceIds((current) => {
      const next = new Set(current);
      currentPageInvoiceIds.forEach((id) => {
        if (checked) next.add(id);
        else next.delete(id);
      });
      return next;
    });
  };

  const columnsWithSelection = useMemo<ColumnDef<InvoiceSummary>[]>(
    () => [
      {
        id: "select",
        header: () => (
          <div onClick={(event) => event.stopPropagation()}>
            <Checkbox
              checked={
                allCurrentPageSelected
                  ? true
                  : currentPageSelectedCount > 0
                    ? "indeterminate"
                    : false
              }
              onCheckedChange={(checked) => toggleCurrentPageSelection(checked === true)}
              aria-label="Select all invoices on this page"
            />
          </div>
        ),
        cell: ({ row }) => {
          const invoiceId = Number(row.original.id);
          const isSelected = Number.isFinite(invoiceId) && selectedInvoiceIds.has(invoiceId);

          return (
            <div onClick={(event) => event.stopPropagation()}>
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => toggleInvoiceSelection(row.original.id, checked === true)}
                aria-label={`Select invoice ${row.original.id}`}
              />
            </div>
          );
        },
        enableSorting: false,
      },
      ...columns,
    ],
    [allCurrentPageSelected, columns, currentPageSelectedCount, selectedInvoiceIds]
  );

  const handleCsvDownload = async () => {
    setDownloadingCsv(true);
    try {
      await downloadInvoicesCSV();
    } catch (err) {
      console.error("Error downloading CSV:", err);
    } finally {
      setDownloadingCsv(false);
    }
  };

  const resolveSelectedYearInvoiceIds = async (): Promise<number[]> => {
    const yearIds = new Set<number>();
    const selectedOnPage = new Set<number>();

    for (const row of invoices) {
      const rowId = Number(row.id);
      if (!Number.isFinite(rowId) || !selectedInvoiceIds.has(rowId)) continue;
      selectedOnPage.add(rowId);
      const ids = (row.invoiceIds?.length ? row.invoiceIds : [row.id])
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id));
      ids.forEach((id) => yearIds.add(id));
    }

    const offPageIds = selectedInvoiceIdList.filter((id) => !selectedOnPage.has(id));
    if (offPageIds.length > 0) {
      const { recipients, truncated } = await getBulkInvoiceRecipients({
        invoiceIds: offPageIds,
        limit: MAX_BULK_INVOICE_DOWNLOAD,
      });
      if (truncated) {
        throw new Error(
          `Selection is too large to mark paid at once (limit ${MAX_BULK_INVOICE_DOWNLOAD}). Select fewer invoices.`
        );
      }
      recipients.forEach((recipient) => {
        recipient.invoiceIds.forEach((id) => {
          const numericId = Number(id);
          if (Number.isFinite(numericId)) yearIds.add(numericId);
        });
      });
    }

    return Array.from(yearIds);
  };

  const openMarkPaidDialog = async () => {
    if (selectedInvoiceIdList.length === 0) {
      toast({
        title: "No invoices selected",
        description: "Select at least one invoice to mark as paid.",
        variant: "destructive",
      });
      return;
    }

    setResolvingMarkPaid(true);
    try {
      const invoiceIds = await resolveSelectedYearInvoiceIds();
      if (invoiceIds.length === 0) {
        throw new Error("No invoice details were found for the selected rows.");
      }
      setMarkPaidInvoiceIds(invoiceIds);
      setMarkPaidDialogOpen(true);
    } catch (error) {
      toast({
        title: "Could not prepare mark paid",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setResolvingMarkPaid(false);
    }
  };

  const handleBulkPdfDownload = async () => {
    if (selectedInvoiceIdList.length === 0) {
      toast({
        title: "No invoices selected",
        description: "Select at least one invoice to download.",
        variant: "destructive",
      });
      return;
    }

    if (selectedInvoiceIdList.length > MAX_BULK_INVOICE_DOWNLOAD) {
      toast({
        title: "Too many invoices selected",
        description: `Download up to ${MAX_BULK_INVOICE_DOWNLOAD} invoices at a time.`,
        variant: "destructive",
      });
      return;
    }

    setDownloadingPdfs(true);
    setDownloadProgress(null);
    setRenderJobs([]);

    try {
      const { recipients, truncated } = await getBulkInvoiceRecipients({
        invoiceIds: selectedInvoiceIdList,
        limit: MAX_BULK_INVOICE_DOWNLOAD,
      });

      if (recipients.length === 0) {
        throw new Error("No invoice details were found for the selected rows.");
      }

      if (truncated) {
        throw new Error(
          `Selection exceeds the ${MAX_BULK_INVOICE_DOWNLOAD}-invoice download limit. Select fewer invoices.`
        );
      }

      const { jobs, warnings } = await buildRenderJobsForRecipients(recipients);
      if (jobs.length === 0) {
        throw new Error("No invoice PDFs could be prepared for the selected invoices.");
      }

      setRenderJobs(jobs);
      await nextFrame();

      const { start, end } = await resolveInvoiceListRange(selectedInvoiceIdList, {
        archived,
        search: appliedSearch,
        sendStatus,
        paymentStatus,
      });

      await downloadInvoicePdfsAsZip(jobs, sheetRefs.current, (completed, total) => {
        setDownloadProgress({ completed, total });
      }, { rangeStart: start, rangeEnd: end });

      toast({
        title: "Download ready",
        description:
          warnings.length > 0
            ? `${jobs.length} invoice PDF${jobs.length === 1 ? "" : "s"} saved. ${warnings.length} could not be loaded.`
            : `${jobs.length} invoice PDF${jobs.length === 1 ? "" : "s"} saved to zip.`,
        variant: warnings.length > 0 ? "destructive" : undefined,
      });
    } catch (error) {
      toast({
        title: "Bulk download failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDownloadingPdfs(false);
      setDownloadProgress(null);
      setRenderJobs([]);
    }
  };

  const handleBulkMarkPaid = async (payload: MarkInvoicePaidPayload) => {
    if (markPaidInvoiceIds.length === 0) {
      toast({
        title: "No invoices selected",
        description: "Select at least one invoice to mark as paid.",
        variant: "destructive",
      });
      return;
    }

    setMarkingPaid(true);
    try {
      const result = await updateInvoicePaymentStatus({
        invoiceIds: markPaidInvoiceIds,
        isPaid: true,
        paidDate: payload.paidDate,
        paymentNotes: payload.paymentNotes,
        sendAcknowledgementEmail: payload.sendAcknowledgementEmail,
      });

      setSelectedInvoiceIds(new Set());
      setMarkPaidInvoiceIds([]);
      setMarkPaidDialogOpen(false);
      await refetch();
      toast({
        title: "Marked as paid",
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
    } catch (error) {
      toast({
        title: "Could not mark invoices paid",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setMarkingPaid(false);
    }
  };

  const switchArchived = () => {
    updateParams({ archived: !archived, offset: 0 });
    setSelectedInvoiceIds(new Set());
  };

  const handleSendStatusChange = (value: InvoiceSendStatusFilter) => {
    updateParams({ sendStatus: value, offset: 0 });
    setSelectedInvoiceIds(new Set());
  };

  const handlePaymentStatusChange = (value: InvoicePaymentStatusFilter) => {
    updateParams({ paymentStatus: value, offset: 0 });
    setSelectedInvoiceIds(new Set());
  };

  const handleSyncWithBrevo = async () => {
    setSyncingBrevo(true);
    setBrevoSyncProgress(null);
    try {
      const result = await syncAllInvoiceDeliveriesFromBrevo({
        limit: 100,
        onlyStale: false,
        onProgress: (data) => {
          const processed = data.offset + data.attempted;
          setBrevoSyncProgress(`${processed}/${data.totalEligible}`);
        },
      });
      await refetch();
      toast({
        title: "Brevo sync complete",
        description: `${result.totals.synced} synced${result.totals.failed > 0 ? `, ${result.totals.failed} failed` : ""} across ${result.totals.batches} batch${result.totals.batches === 1 ? "" : "es"}.`,
        variant: result.totals.failed > 0 ? "destructive" : undefined,
      });
    } catch (error) {
      toast({
        title: "Brevo sync failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSyncingBrevo(false);
      setBrevoSyncProgress(null);
    }
  };

  if (isLoading) {
    return (
      <>
        <div className="flex border rounded-xl items-center gap-4 bg-white m-4 p-4">
          <div className="w-full">
            <div className="h-8 w-24 bg-muted animate-pulse rounded" />
            <div className="h-5 w-40 bg-muted animate-pulse rounded mt-2" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-10 flex-1 max-w-md w-80 bg-muted animate-pulse rounded" />
            <div className="h-10 w-10 bg-muted animate-pulse rounded shrink-0" />
          </div>
          <div className="h-10 w-40 bg-muted animate-pulse rounded" />
          <div className="h-10 w-24 bg-muted animate-pulse rounded" />
        </div>
        <TableSkeleton />
      </>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col justify-center items-center py-20 gap-2">
        <Button variant="blue" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex border rounded-xl items-center gap-4 bg-white m-4 p-4">
        <div className="w-full">
          <h2 className="text-2xl font-bold">{total}</h2>
          <h3>Total number of Invoices</h3>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex flex-1 items-center max-w-md w-80 min-w-0">
            <Input
              type="text"
              placeholder="Search by property/account number or #client number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitSearch();
                }
              }}
              className="pr-9 w-full"
              aria-label="Search invoices by property/account number or client number (e.g. #4324)"
            />
            {(searchTerm || appliedSearch) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearSearch}
                className="absolute right-1 h-7 w-7 p-0"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={commitSearch}
            aria-label="Run search"
          >
            <Search className="h-4 w-4" />
          </Button>
          <Select
            value={sendStatus}
            onValueChange={(value) => handleSendStatusChange(value as InvoiceSendStatusFilter)}
          >
            <SelectTrigger className="w-[11rem] shrink-0" aria-label="Filter by email status">
              <SelectValue placeholder="Email status" />
            </SelectTrigger>
            <SelectContent>
              {INVOICE_EMAIL_FILTER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={paymentStatus}
            onValueChange={(value) =>
              handlePaymentStatusChange(value as InvoicePaymentStatusFilter)
            }
          >
            <SelectTrigger className="w-[9.5rem] shrink-0" aria-label="Filter by payment status">
              <SelectValue placeholder="Payment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">All payments</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="outline"
          disabled={syncingBrevo}
          onClick={() => void handleSyncWithBrevo()}
        >
          {syncingBrevo ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            <RefreshCw />
          )}
          {syncingBrevo && brevoSyncProgress
            ? `Syncing ${brevoSyncProgress}…`
            : "Sync with Brevo"}
        </Button>
        <Button variant={"blue"} onClick={switchArchived}>
          <Archive />
          {archived ? "View Active Invoices" : "View Archive"}
        </Button>
        {!archived && (
          <Button variant="blue" onClick={() => setBulkSendOpen(true)}>
            <Mail />
            {selectedInvoiceIdList.length > 0
              ? `Bulk Send (${selectedInvoiceIdList.length})`
              : "Bulk Send"}
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="blue"
              disabled={
                selectedInvoiceIdList.length === 0 ||
                downloadingPdfs ||
                markingPaid ||
                resolvingMarkPaid
              }
            >
              {downloadingPdfs || markingPaid || resolvingMarkPaid ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <ChevronDown />
              )}
              {downloadingPdfs && downloadProgress
                ? `Preparing ${downloadProgress.completed}/${downloadProgress.total}...`
                : markingPaid
                  ? "Marking paid..."
                  : resolvingMarkPaid
                    ? "Preparing..."
                    : selectedInvoiceIdList.length > 0
                      ? `Actions (${selectedInvoiceIdList.length})`
                      : "Actions"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem
              disabled={downloadingPdfs}
              onClick={() => void handleBulkPdfDownload()}
            >
              <FileArchive />
              Bulk Download ({selectedInvoiceIdList.length})
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={markingPaid || resolvingMarkPaid}
              onClick={() => void openMarkPaidDialog()}
            >
              <CheckCircle2 />
              Mark Paid ({selectedInvoiceIdList.length})
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {selectedInvoiceIdList.length > 0 && (
          <Button
            type="button"
            variant="outline"
            onClick={() => setSelectedInvoiceIds(new Set())}
          >
            Clear Selection
          </Button>
        )}
        <Button onClick={handleCsvDownload} disabled={downloadingCsv}>
          {downloadingCsv ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            <Download />
          )}
        </Button>
      </div>
      <BulkInvoiceSendDialog
        open={bulkSendOpen}
        onOpenChange={setBulkSendOpen}
        filters={
          selectedInvoiceIdList.length > 0
            ? { invoiceIds: selectedInvoiceIdList }
            : {
                search: searchTerm.trim() || appliedSearch || undefined,
                paymentStatus: "unpaid",
              }
        }
        onSent={() => {
          setSelectedInvoiceIds(new Set());
          void refetch();
          window.setTimeout(() => {
            void refetch();
          }, 45000);
        }}
      />
      <MarkInvoicePaidDialog
        open={markPaidDialogOpen}
        onOpenChange={(open) => {
          setMarkPaidDialogOpen(open);
          if (!open) setMarkPaidInvoiceIds([]);
        }}
        invoiceCount={markPaidInvoiceIds.length}
        submitting={markingPaid}
        onConfirm={handleBulkMarkPaid}
      />
      <TableBuilder
        data={invoices}
        columns={columnsWithSelection}
        label="Invoices"
        emptyState={{
          title: "No invoices yet",
          description: "Invoices will appear here once you generate them for clients.",
          action: { label: "Go to clients", to: routes.clients.list() },
        }}
        serverPagination={{
          total,
          limit: effectiveLimit,
          offset,
          hasMore,
          onPrev: () =>
            updateParams({
              offset: Math.max(0, offset - effectiveLimit),
            }),
          onNext: () => updateParams({ offset: offset + effectiveLimit }),
          onPageSizeChange: (size) => {
            if (size > MAX_API_PAGE_SIZE) {
              toast({
                title: "Page size capped at 100",
                description: `The API returns at most ${MAX_API_PAGE_SIZE} invoices per page. Use pagination or select across pages for bulk download.`,
              });
            }
            updateParams({
              limit: Math.min(size, MAX_API_PAGE_SIZE),
              offset: 0,
            });
          },
        }}
      />
      <InvoicePdfRenderSheets jobs={renderJobs} sheetRefs={sheetRefs} />
    </div>
  );
};

export default InvoicesTable;
