import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { LoaderCircle, FileUp, Eye, FileSpreadsheet, ArrowRight } from "lucide-react";
import {
  previewClientsPropertiesCsv,
  previewInvoicesCsv,
  uploadClientsPropertiesCsv,
  uploadInvoicesCsv,
} from "@/api/api";

type CsvUploadType = "clientsProperties" | "invoices";

const uploadTypeMeta: Record<
  CsvUploadType,
  {
    title: string;
    description: string;
    preview: (file: File) => Promise<unknown>;
    upload: (file: File) => Promise<unknown>;
  }
> = {
  clientsProperties: {
    title: "Clients & Properties",
    description:
      "Preview or import a CSV that can create/update clients and properties.",
    preview: previewClientsPropertiesCsv,
    upload: uploadClientsPropertiesCsv,
  },
  invoices: {
    title: "Invoices",
    description:
      "Preview or import an invoices CSV (upsert by propertyId + year).",
    preview: previewInvoicesCsv,
    upload: uploadInvoicesCsv,
  },
};

const sampleCsv: Record<
  CsvUploadType,
  {
    headersLine: string;
    sampleLine: string;
  }
> = {
  clientsProperties: {
    headersLine:
      'Client ID,Client Name,CAD Name,Mailing Address,City,Zip Code,Property Address,County,City,Contact Number,Email Address,Account Number,Account Type,BPP FEE,Contingency Fee,Flat Fee',
    sampleLine:
      '1000,"HUSSAIN ALI","ALI MOMIN-JAFFER","1327 KYLE HILL LN",Sugar Land,77479,"1327 KYLE HILL LN SUGAR LAND TEXAS 77479",Fort Bend,Sugar Land,7135056806,hali@lsptax.com,R226434,,,25,',
  },
  invoices: {
    headersLine:
      "year,Account Number,protestDate,bppRendered,bppInvoice,bppPaid,noticeLandValue,noticeImprovementValue,noticeMarketValue,noticeAppraisedValue,finalLandValue,finalImprovementValue,finalMarketValue,finalAppraisedValue,marketReduction,appraisedReduction,taxRate,taxableSavings,contingencyFee,invoiceAmount,hearingDate,generatedDate,dueDate,invoiceDate,paidDate,paymentNotes",
    sampleLine:
      "2024,R226434,,,,,63206,428714,491920,418817,63206,441741,504947,460699,11233,41882,2.45,1850,555,2405,,,,",
  },
};

export default function CsvUploadsPage() {
  const { toast } = useToast();
  const [uploadType, setUploadType] = useState<CsvUploadType>("clientsProperties");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<null | "preview" | "upload">(null);
  const [result, setResult] = useState<unknown>(null);
  const [lastAction, setLastAction] = useState<null | "preview" | "upload">(null);
  const [lastOutcome, setLastOutcome] = useState<null | "success" | "error">(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const meta = useMemo(() => uploadTypeMeta[uploadType], [uploadType]);

  const canRun = !!file && !busy;

  const run = async (mode: "preview" | "upload") => {
    if (!file) {
      toast({
        variant: "destructive",
        title: "Choose a CSV file",
        description: "Please select a .csv file first.",
      });
      return;
    }

    setBusy(mode);
    setLastAction(mode);
    setLastOutcome(null);
    setResult(null);
    try {
      const data = mode === "preview" ? await meta.preview(file) : await meta.upload(file);
      setResult(data);
      setLastOutcome("success");
      toast({
        title: mode === "preview" ? "Preview ready" : "Upload complete",
        description:
          mode === "preview"
            ? "Review the summary below to see what will be created/updated."
            : "The CSV has been imported.",
      });
    } catch (e) {
      const err = e as Error & { details?: Record<string, unknown> };
      const message = err?.message ?? "Request failed";
      if (err?.details && typeof err.details === "object" && "message" in err.details) {
        setResult(err.details);
      }
      setLastOutcome("error");
      toast({
        variant: "destructive",
        title: mode === "preview" ? "Preview failed" : "Upload failed",
        description: message,
      });
    } finally {
      setBusy(null);
    }
  };

  const onChooseFileClick = () => fileInputRef.current?.click();

  const setFileFromDrop = (dropped?: File | null) => {
    if (!dropped) return;
    const isCsv =
      dropped.type === "text/csv" ||
      dropped.name.toLowerCase().endsWith(".csv") ||
      dropped.type === "application/vnd.ms-excel"; // some browsers
    if (!isCsv) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please upload a .csv file.",
      });
      return;
    }
    setFile(dropped);
    setResult(null);
  };

  const prettyBytes = (bytes: number) => {
    const kb = bytes / 1024;
    if (kb < 1024) return `${Math.round(kb)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null && !Array.isArray(v);

  const collectPreviewSignals = (v: unknown) => {
    const counters: Record<string, number> = {};
    const lists: Array<{ label: string; items: unknown[] }> = [];

    const addCount = (label: string, n: number) => {
      if (!Number.isFinite(n)) return;
      counters[label] = (counters[label] ?? 0) + n;
    };

    const maybeLabelForKey = (key: string) => {
      const k = key.toLowerCase();
      if (k.includes("new")) return "New";
      if (k.includes("create")) return "Created";
      if (k.includes("updated") || k.includes("update")) return "Updated";
      if (k.includes("unchanged") || k.includes("skipped")) return "Unchanged/Skipped";
      if (k.includes("error") || k.includes("invalid")) return "Errors";
      if (k.includes("warning")) return "Warnings";
      return null;
    };

    const walk = (node: unknown, path: string[]) => {
      if (Array.isArray(node)) {
        const lastKey = path[path.length - 1] ?? "items";
        const label = maybeLabelForKey(lastKey);
        if (label) {
          addCount(label, node.length);
          lists.push({ label: `${label} • ${path.join(".")}`, items: node });
        }
        node.forEach((x, i) => walk(x, [...path, String(i)]));
        return;
      }
      if (!isRecord(node)) return;

      for (const [k, val] of Object.entries(node)) {
        const label = maybeLabelForKey(k);
        if (label && typeof val === "number") addCount(label, val);
        walk(val, [...path, k]);
      }
    };

    walk(v, []);

    // If backend returns { data: ... }, also collect from that
    if (isRecord(v) && "data" in v) walk((v as Record<string, unknown>).data, ["data"]);

    // De-dupe lists by label (keep first)
    const seen = new Set<string>();
    const uniqueLists = lists.filter((l) => {
      if (seen.has(l.label)) return false;
      seen.add(l.label);
      return true;
    });

    return { counters, lists: uniqueLists };
  };

  const previewSignals = useMemo(() => collectPreviewSignals(result), [result]);

  type CsvErrorDetails = {
    line?: number;
    expectedColumns?: number;
    actualColumns?: number;
    hint?: string;
    errors?: Array<{ line?: number; message?: string }>;
    [k: string]: unknown;
  };

  type CsvErrorResult = {
    code?: string;
    message: string;
    details?: CsvErrorDetails;
  };

  const errorResult =
    lastOutcome === "error" && result && typeof result === "object" && !Array.isArray(result)
      ? (result as CsvErrorResult)
      : null;

  const successMessage = useMemo(() => {
    if (lastOutcome !== "success") return null;
    if (!result || typeof result !== "object" || Array.isArray(result)) return null;
    const r = result as Record<string, unknown>;
    return typeof r.message === "string" ? r.message : null;
  }, [lastOutcome, result]);

  const sampleRows = useMemo(() => {
    const { headersLine, sampleLine } = sampleCsv[uploadType];
    const headers = headersLine.split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
    const sample = sampleLine.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    return headers.map((field, idx) => ({
      field,
      example: sample[idx] ?? "",
    }));
  }, [uploadType]);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: `${label} copied` });
    } catch {
      toast({
        variant: "destructive",
        title: "Copy failed",
        description: "Clipboard permission blocked by browser.",
      });
    }
  };

  const guessColumns = (items: unknown[]) => {
    const preferred = [
      "id",
      "clientNumber",
      "accountNumber",
      "year",
      "clientName",
      "email",
      "phoneNumber",
      "county",
      "cadCounty",
      "propertyId",
    ];
    const sample = items.find(isRecord);
    if (!sample) return [];
    const keys = Object.keys(sample);
    return preferred.filter((k) => keys.includes(k)).slice(0, 5);
  };

  return (
    <div className="p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-6">
        <div>
          <div className="inline-flex items-center gap-2">
          
          </div>
          <h1 className="text-3xl font-bold tracking-tight mt-2">CSV Uploads</h1>
          <p className="text-muted-foreground mt-1 max-w-2xl">
            Choose what you need to upload. Start with <span className="font-semibold">Preview</span> to see what will be added or updated before importing.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left: Type + File */}
        <div className="xl:col-span-7 space-y-6">
          <Card>
            <CardHeader className="p-6">
              <CardTitle className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-muted text-brand-secondary text-sm font-bold">
                  1
                </span>
                Choose upload type
              </CardTitle>
              <CardDescription>Pick the CSV format you’re working with.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setUploadType("clientsProperties");
                    setResult(null);
                  }}
                  className={`group relative overflow-hidden rounded-xl border p-5 text-left transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    uploadType === "clientsProperties"
                      ? "border-brand-secondary bg-gradient-to-br from-brand-muted to-white"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-semibold text-gray-900">Clients & Properties</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Preview/import into Client and Property tables.
                      </div>
                    </div>
                    <div
                      className={`h-10 w-10 rounded-lg flex items-center justify-center border ${
                        uploadType === "clientsProperties"
                          ? "border-brand-secondary text-brand-secondary bg-white"
                          : "text-gray-600 bg-white"
                      }`}
                    >
                      <FileSpreadsheet className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono">/csv/preview-clients-properties</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setUploadType("invoices");
                    setResult(null);
                  }}
                  className={`group relative overflow-hidden rounded-xl border p-5 text-left transition focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    uploadType === "invoices"
                      ? "border-brand-secondary bg-gradient-to-br from-brand-muted to-white"
                      : "hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-semibold text-gray-900">Invoices</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Preview/import invoices (upsert by propertyId + year).
                      </div>
                    </div>
                    <div
                      className={`h-10 w-10 rounded-lg flex items-center justify-center border ${
                        uploadType === "invoices"
                          ? "border-brand-secondary text-brand-secondary bg-white"
                          : "text-gray-600 bg-white"
                      }`}
                    >
                      <FileSpreadsheet className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono">/csv/preview-invoices</span>
                  </div>
                </button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <details className="group">
              <summary className="cursor-pointer select-none list-none">
                <CardHeader className="p-6">
                  <CardTitle className="flex items-center justify-between">
                    Sample CSV format
                    <span className="text-sm font-normal text-muted-foreground">
                      Click to expand
                    </span>
                  </CardTitle>
                  <CardDescription>
                    Single-column view of expected fields (header) with an example value.
                  </CardDescription>
                </CardHeader>
              </summary>
              <CardContent className="p-6 pt-0 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="text-sm">
                    <span className="font-semibold">{meta.title}</span>{" "}
                    <span className="text-muted-foreground">sample</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(sampleCsv[uploadType].headersLine, "Headers")
                      }
                    >
                      Copy headers
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        copyToClipboard(
                          `${sampleCsv[uploadType].headersLine}\n${sampleCsv[uploadType].sampleLine}`,
                          "Sample CSV"
                        )
                      }
                    >
                      Copy sample CSV
                    </Button>
                  </div>
                </div>

                <div className="rounded-xl border overflow-hidden">
                  <div className="grid grid-cols-2 bg-gray-50 text-xs font-semibold text-gray-700">
                    <div className="p-3 border-r">Field (header)</div>
                    <div className="p-3">Example</div>
                  </div>
                  <div className="max-h-[320px] overflow-auto">
                    {sampleRows.map((row) => (
                      <div key={row.field} className="grid grid-cols-2 text-xs border-t">
                        <div className="p-3 border-r font-mono break-words">{row.field}</div>
                        <div className="p-3 break-words">{row.example || <span className="text-muted-foreground">—</span>}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </details>
          </Card>

          <Card>
            <CardHeader className="p-6">
              <CardTitle className="flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-muted text-brand-secondary text-sm font-bold">
                  2
                </span>
                Upload CSV
              </CardTitle>
              <CardDescription>{meta.description}</CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0 space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => setFileFromDrop(e.target.files?.[0] ?? null)}
              />

              <div
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(false);
                  setFileFromDrop(e.dataTransfer.files?.[0] ?? null);
                }}
                className={`rounded-xl border border-dashed p-6 transition ${
                  isDragging ? "border-brand-secondary bg-brand-muted" : "bg-white hover:bg-gray-50"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      <FileSpreadsheet className="h-5 w-5 text-gray-700" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">Drop your CSV here</div>
                      <div className="text-sm text-muted-foreground">
                        or click to choose a file
                      </div>
                    </div>
                  </div>
                  <Button type="button" variant="outline" onClick={onChooseFileClick}>
                    Choose file
                  </Button>
                </div>

                {file && (
                  <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border bg-white p-4">
                    <div>
                      <div className="text-sm font-medium">{file.name}</div>
                      <div className="text-xs text-muted-foreground">{prettyBytes(file.size)}</div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setFile(null);
                        setResult(null);
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  onClick={() => run("preview")}
                  disabled={!canRun}
                  className="flex items-center justify-center gap-2"
                >
                  {busy === "preview" ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  Preview
                  <ArrowRight className="h-4 w-4 opacity-60" />
                </Button>
                <Button
                  variant="blue"
                  onClick={() => run("upload")}
                  disabled={!canRun}
                  className="flex items-center justify-center gap-2"
                >
                  {busy === "upload" ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileUp className="h-4 w-4" />
                  )}
                  Upload
                </Button>
                <div className="text-xs text-muted-foreground sm:ml-auto sm:text-right self-center">
                  Field name: <span className="font-mono">csv</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Results */}
        <div className="xl:col-span-5 space-y-6">
          <Card>
            <CardHeader className="p-6">
              <CardTitle>Result</CardTitle>
              <CardDescription>
                Preview shows what will be added/updated. Upload performs the import.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              {!result ? (
                <div className="rounded-xl border bg-gray-50 p-5 text-sm text-muted-foreground">
                  No result yet. Choose a CSV and click <span className="font-semibold">Preview</span>.
                </div>
              ) : errorResult ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-destructive/50 bg-destructive/5 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-destructive">
                          {errorResult.code ? errorResult.code : "CSV error"}
                        </div>
                        <p className="mt-2 text-sm text-gray-800">{errorResult.message}</p>
                      </div>
                      {errorResult.code && (
                        <Badge variant="destructive" className="rounded-md">
                          {errorResult.code}
                        </Badge>
                      )}
                    </div>

                    {(errorResult.details?.hint ||
                      errorResult.details?.line != null ||
                      errorResult.details?.expectedColumns != null ||
                      errorResult.details?.actualColumns != null) && (
                      <div className="mt-4 rounded-lg border bg-white p-3 text-xs">
                        <div className="font-medium text-gray-700 mb-2">Details</div>
                        <div className="space-y-1 text-muted-foreground">
                          {errorResult.details?.line != null && (
                            <div>
                              <span className="font-medium text-gray-700">Line:</span>{" "}
                              <span className="font-mono">{errorResult.details.line}</span>
                            </div>
                          )}
                          {errorResult.details?.expectedColumns != null &&
                            errorResult.details?.actualColumns != null && (
                              <div>
                                <span className="font-medium text-gray-700">Columns:</span>{" "}
                                expected{" "}
                                <span className="font-mono">{errorResult.details.expectedColumns}</span>, got{" "}
                                <span className="font-mono">{errorResult.details.actualColumns}</span>
                              </div>
                            )}
                          {errorResult.details?.hint && (
                            <div>
                              <span className="font-medium text-gray-700">Hint:</span>{" "}
                              {errorResult.details.hint}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {Array.isArray(errorResult.details?.errors) &&
                      errorResult.details!.errors!.length > 0 && (
                      <div className="mt-4">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div className="text-xs font-medium text-gray-700">Details by row</div>
                          {errorResult.details!.errors!.length > 10 && (
                            <div className="text-xs text-muted-foreground">
                              Showing first 10 of {errorResult.details!.errors!.length}
                            </div>
                          )}
                        </div>
                        <div className="rounded-lg border overflow-hidden">
                          <table className="min-w-full text-xs">
                            <thead>
                              <tr className="bg-gray-100 text-left">
                                <th className="p-2 font-medium">Line</th>
                                <th className="p-2 font-medium">Message</th>
                              </tr>
                            </thead>
                            <tbody>
                              {errorResult.details!.errors!.slice(0, 10).map((row, idx) => (
                                <tr key={idx} className="border-t">
                                  <td className="p-2 font-mono">{row.line ?? "—"}</td>
                                  <td className="p-2">{row.message ?? "—"}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {successMessage && (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                      <div className="text-sm font-semibold text-emerald-900">
                        Success
                      </div>
                      <p className="mt-2 text-sm text-emerald-900">{successMessage}</p>
                    </div>
                  )}
                  <div className="rounded-xl border bg-gray-50 p-4">
                    <div className="text-sm font-semibold">
                      {lastAction === "upload" ? "Upload summary" : "Preview summary"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Key counts and a human-friendly preview of changes.
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {Object.entries(previewSignals.counters).length > 0 ? (
                        Object.entries(previewSignals.counters).map(([k, n]) => (
                          <Badge key={k} variant="outline" className="rounded-md">
                            {k}: <span className="ml-1 font-semibold">{n}</span>
                          </Badge>
                        ))
                      ) : (
                        <Badge variant="outline" className="rounded-md">
                          Counts not provided by server
                        </Badge>
                      )}
                    </div>
                  </div>

                  {lastAction === "preview" && previewSignals.lists.length > 0 && (
                    <div className="space-y-3">
                      {previewSignals.lists.slice(0, 4).map((list, listIdx) => {
                        const items = list.items;
                        const cols = guessColumns(items);
                        const rows = items.slice(0, 6);
                        return (
                          <details key={`${list.label}-${listIdx}`} className="group rounded-xl border bg-white">
                            <summary className="cursor-pointer select-none list-none p-4 flex items-center justify-between">
                              <div className="text-sm font-semibold">{list.label}</div>
                              <div className="text-xs text-muted-foreground">
                                {items.length} item(s)
                              </div>
                            </summary>
                            <div className="border-t p-4">
                              {cols.length > 0 ? (
                                <div className="overflow-auto">
                                  <table className="min-w-full text-xs">
                                    <thead>
                                      <tr className="text-left text-muted-foreground">
                                        {cols.map((c, colIdx) => (
                                          <th key={colIdx} className="py-1 pr-4 font-medium">
                                            {c}
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {rows.map((r, idx) => (
                                        <tr key={idx} className="border-t">
                                          {cols.map((c, colIdx) => (
                                            <td key={colIdx} className="py-2 pr-4">
                                              {isRecord(r) ? String(r[c] ?? "") : ""}
                                            </td>
                                          ))}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <pre className="text-xs bg-gray-50 border rounded-lg p-3 overflow-auto max-h-[240px]">
                                  {JSON.stringify(rows, null, 2)}
                                </pre>
                              )}
                              {items.length > rows.length && (
                                <div className="text-xs text-muted-foreground mt-2">
                                  Showing first {rows.length} items.
                                </div>
                              )}
                            </div>
                          </details>
                        );
                      })}
                    </div>
                  )}

                  <details className="group rounded-xl border bg-white">
                    <summary className="cursor-pointer select-none list-none p-4 flex items-center justify-between">
                      <div className="text-sm font-semibold">Advanced: Raw JSON</div>
                      <div className="text-xs text-muted-foreground group-open:hidden">Expand</div>
                      <div className="text-xs text-muted-foreground hidden group-open:block">Collapse</div>
                    </summary>
                    <div className="border-t">
                      <pre className="text-xs bg-white p-4 overflow-auto max-h-[520px]">
                        {JSON.stringify(result, null, 2)}
                      </pre>
                    </div>
                  </details>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

