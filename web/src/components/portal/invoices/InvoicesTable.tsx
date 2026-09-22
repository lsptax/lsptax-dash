import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  expandGroupedInvoiceIds,
  getBulkInvoiceRecipients,
  getFilteredInvoiceIds,
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
import { PROPERTY_INVOICE_YEARS } from "@/components/portal/properties/propertyInvoiceYears";
import {
  mergeInvoiceListParams,
  parseInvoiceListParams,
} from "./invoiceListSearchParams";
import { useListSearchParams } from "@/hooks/useListSearchParams";
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
    minAmount,
    maxAmount,
    years,
    offset,
    limit,
    archived,
  } = params;
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
  const [selectingAllFiltered, setSelectingAllFiltered] = useState(false);
  const selectAllRequestRef = useRef(0);
  const [minAmountDraft, setMinAmountDraft] = useState(minAmount == null ? "" : String(minAmount));
  const [maxAmountDraft, setMaxAmountDraft] = useState(maxAmount == null ? "" : String(maxAmount));
  const amountEditingRef = useRef(false);

  useEffect(() => {
    if (amountEditingRef.current) return;
    setMinAmountDraft(minAmount == null ? "" : String(minAmount));
    setMaxAmountDraft(maxAmount == null ? "" : String(maxAmount));
  }, [minAmount, maxAmount]);

  const { data, isLoading, isError, refetch } = useInvoicesQuery({
    limit,
    offset,
    search: appliedSearch,
    archived,
    sendStatus,
    paymentStatus,
    minAmount,
    maxAmount,
    years,
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
  const allFilteredSelected = total > 0 && selectedInvoiceIds.size === total;
  const canSelectAllFiltered = total > currentPageInvoiceIds.length;

  const selectionFilterKey = `${archived}|${appliedSearch}|${sendStatus}|${paymentStatus}|${minAmount ?? ""}|${maxAmount ?? ""}|${years.join(",")}`;
  const selectionFilterKeyRef = useRef(selectionFilterKey);
  useEffect(() => {
    if (selectionFilterKeyRef.current === selectionFilterKey) return;
    selectionFilterKeyRef.current = selectionFilterKey;
    selectAllRequestRef.current += 1;
    setSelectingAllFiltered(false);
    setSelectedInvoiceIds(new Set());
  }, [selectionFilterKey]);

  const selectAllFiltered = async () => {
    const requestId = ++selectAllRequestRef.current;
    setSelectingAllFiltered(true);
    try {
      const ids = await getFilteredInvoiceIds({
        archived,
        search: appliedSearch || undefined,
        sendStatus,
        paymentStatus,
        minAmount,
        maxAmount,
        years,
      });
      if (requestId !== selectAllRequestRef.current) return;
      setSelectedInvoiceIds(new Set(ids));
    } catch (error) {
      if (requestId !== selectAllRequestRef.current) return;
      toast({
        title: "Could not select every invoice",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      if (requestId === selectAllRequestRef.current) setSelectingAllFiltered(false);
    }
  };

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
              onCheckedChange={(checked) => {
                if (!checked && allFilteredSelected) {
                  setSelectedInvoiceIds(new Set());
                  return;
                }
                toggleCurrentPageSelection(checked === true);
              }}
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
    [allCurrentPageSelected, allFilteredSelected, columns, currentPageSelectedCount, selectedInvoiceIds]
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
    return expandGroupedInvoiceIds({
      ids: selectedInvoiceIdList,
      archived,
      search: appliedSearch || undefined,
      sendStatus,
      paymentStatus,
      minAmount,
      maxAmount,
      years,
    });
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

    setDownloadingPdfs(true);
    setDownloadProgress(null);
    setRenderJobs([]);

    try {
      const invoiceIds = await expandGroupedInvoiceIds({
        ids: selectedInvoiceIdList,
        archived,
        search: appliedSearch || undefined,
        sendStatus,
        paymentStatus,
        minAmount,
        maxAmount,
        years,
      });
      if (invoiceIds.length > MAX_BULK_INVOICE_DOWNLOAD) {
        throw new Error(
          `Download up to ${MAX_BULK_INVOICE_DOWNLOAD} invoices at a time.`
        );
      }
      const { recipients, truncated } = await getBulkInvoiceRecipients({
        invoiceIds,
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
        minAmount,
        maxAmount,
        years,
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
              templateKey: payload.templateKey,
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

  const applyAmountRange = () => {
    const parsedMin = parseAmountDraft(minAmountDraft);
    const parsedMax = parseAmountDraft(maxAmountDraft);
    if (parsedMin === "invalid" || parsedMax === "invalid") {
      toast({
        title: "Enter a valid amount",
        description: "Use zero or a positive number.",
        variant: "destructive",
      });
      return;
    }
    if (parsedMin != null && parsedMax != null && parsedMin > parsedMax) {
      toast({
        title: "Amount range is reversed",
        description: "Minimum amount needs to be less than or equal to the maximum.",
        variant: "destructive",
      });
      return;
    }
    if (parsedMin === minAmount && parsedMax === maxAmount) return;
    updateParams({ minAmount: parsedMin, maxAmount: parsedMax, offset: 0 });
    setSelectedInvoiceIds(new Set());
  };

  const handleYearsChange = (nextYears: number[]) => {
    updateParams({ years: nextYears, offset: 0 });
    setSelectedInvoiceIds(new Set());
  };

  const filtersActive =
    sendStatus !== "all" ||
    paymentStatus !== "any" ||
    minAmount != null ||
    maxAmount != null ||
    years.length > 0;

  const clearFilters = () => {
    setMinAmountDraft("");
    setMaxAmountDraft("");
    updateParams({
      sendStatus: "all",
      paymentStatus: "any",
      minAmount: null,
      maxAmount: null,
      years: [],
      offset: 0,
    });
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
        <div className="portal-toolbar">
          <div className="w-full">
            <div className="h-8 w-24 bg-muted animate-pulse rounded" />
            <div className="h-5 w-40 bg-muted animate-pulse rounded mt-2" />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-10 w-40 bg-muted animate-pulse rounded" />
            <div className="h-10 w-36 bg-muted animate-pulse rounded" />
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
      <div className="portal-toolbar !flex-wrap">
        <div className="mr-auto shrink-0">
          <p className="text-2xl font-semibold tabular-nums">{total}</p>
          <p className="text-sm text-muted-foreground">Invoices</p>
        </div>

        <div className="order-last flex w-full flex-wrap items-end gap-3 border-t pt-3">
          <FilterField label="Email">
            <Select
              value={sendStatus}
              onValueChange={(value) => handleSendStatusChange(value as InvoiceSendStatusFilter)}
            >
              <SelectTrigger className="h-9 w-[11rem]" aria-label="Filter by email status">
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
          </FilterField>
          <FilterField label="Payment">
            <Select
              value={paymentStatus}
              onValueChange={(value) =>
                handlePaymentStatusChange(value as InvoicePaymentStatusFilter)
              }
            >
              <SelectTrigger className="h-9 w-[9.5rem]" aria-label="Filter by payment status">
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">All payments</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
          <FilterField label="Year">
            <YearMultiSelect years={years} onChange={handleYearsChange} />
          </FilterField>
          <FilterField label="Amount">
            <div
              className="flex items-center gap-1.5"
              onFocus={() => {
                amountEditingRef.current = true;
              }}
              onBlur={(event) => {
                const next = event.relatedTarget;
                if (next instanceof Node && event.currentTarget.contains(next)) return;
                amountEditingRef.current = false;
                applyAmountRange();
              }}
            >
              <div className="relative">
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  $
                </span>
                <Input
                  inputMode="decimal"
                  aria-label="Minimum amount"
                  placeholder="Min"
                  value={minAmountDraft}
                  onChange={(event) => setMinAmountDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") applyAmountRange();
                  }}
                  className="h-9 w-[6.5rem] pl-6"
                />
              </div>
              <span className="text-muted-foreground">–</span>
              <div className="relative">
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  $
                </span>
                <Input
                  inputMode="decimal"
                  aria-label="Maximum amount"
                  placeholder="Max"
                  value={maxAmountDraft}
                  onChange={(event) => setMaxAmountDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") applyAmountRange();
                  }}
                  className="h-9 w-[6.5rem] pl-6"
                />
              </div>
            </div>
          </FilterField>
          {filtersActive ? (
            <Button type="button" variant="ghost" size="sm" className="mb-0.5" onClick={clearFilters}>
              Clear filters
            </Button>
          ) : null}
        </div>

        {canSelectAllFiltered && (allCurrentPageSelected || selectingAllFiltered || allFilteredSelected) ? (
          <div className="order-last flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg bg-muted/70 px-3 py-2 text-sm">
            {selectingAllFiltered ? (
              <span className="flex items-center gap-2 text-muted-foreground">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Selecting all {total.toLocaleString()} invoices in this view…
              </span>
            ) : allFilteredSelected ? (
              <>
                <span>
                  All <span className="font-medium text-foreground">{total.toLocaleString()}</span> invoices
                  in this view are selected.
                </span>
                <Button
                  type="button"
                  variant="link"
                  className="h-auto px-0 text-primary"
                  onClick={() => setSelectedInvoiceIds(new Set())}
                >
                  Clear selection
                </Button>
              </>
            ) : (
              <>
                <span>
                  All{" "}
                  <span className="font-medium text-foreground">
                    {currentPageInvoiceIds.length.toLocaleString()}
                  </span>{" "}
                  on this page are selected.
                </span>
                <Button
                  type="button"
                  variant="link"
                  className="h-auto px-0 text-primary"
                  onClick={() => void selectAllFiltered()}
                >
                  Select all {total.toLocaleString()} invoices
                </Button>
              </>
            )}
          </div>
        ) : null}

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
        <Button variant="outline" onClick={switchArchived}>
          <Archive />
          {archived ? "View Active Invoices" : "View Archive"}
        </Button>
        {!archived && (
          <Button variant="blue" onClick={() => setBulkSendOpen(true)}>
            <Mail />
            {selectedInvoiceIdList.length > 0
              ? `Send email (${selectedInvoiceIdList.length})`
              : "Send email"}
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
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
        <Button variant="outline" onClick={handleCsvDownload} disabled={downloadingCsv}>
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
            ? {
                invoiceIds: selectedInvoiceIdList,
                ...(years.length > 0 ? { years } : {}),
              }
            : {
                search: appliedSearch || undefined,
                paymentStatus: "unpaid",
                ...(years.length > 0 ? { years } : {}),
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

function parseAmountDraft(value: string): number | null | "invalid" {
  const trimmed = value.trim().replace(/[$,]/g, "");
  if (!trimmed) return null;
  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount < 0) return "invalid";
  return amount;
}

function YearMultiSelect({
  years,
  onChange,
}: {
  years: number[];
  onChange: (years: number[]) => void;
}) {
  const label = years.length === 0 ? "All years" : years.join(", ");

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="flex h-9 w-[9.5rem] justify-between px-3 font-normal"
          aria-label="Filter by tax year"
        >
          <span className="truncate">{label}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[9.5rem] p-1">
        {PROPERTY_INVOICE_YEARS.map((year) => {
          const checked = years.includes(year);
          return (
            <label
              key={year}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
            >
              <Checkbox
                checked={checked}
                onCheckedChange={(next) => {
                  const selected = new Set(years);
                  if (next) selected.add(year);
                  else selected.delete(year);
                  onChange(
                    PROPERTY_INVOICE_YEARS.filter((option) => selected.has(option))
                  );
                }}
              />
              {year}
            </label>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

function FilterField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
