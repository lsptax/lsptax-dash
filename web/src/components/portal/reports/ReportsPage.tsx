import { useEffect, useMemo, useState } from "react";
import { Download, FileSpreadsheet, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { downloadPropertiesReportCsv, getReportCounties } from "@/api/api";

function ReportCard({
  title,
  description,
  icon,
  children,
  footer,
}: {
  title: string;
  description: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {icon ? (
              <div className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-muted text-brand-secondary">
                {icon}
              </div>
            ) : null}
            <div>
              <div className="text-lg font-semibold text-gray-900">{title}</div>
              <div className="text-sm text-muted-foreground mt-1">{description}</div>
            </div>
          </div>
        </div>
        {children ? <div className="mt-5">{children}</div> : null}
      </div>
      {footer ? <div className="border-t bg-gray-50/60 px-6 py-4">{footer}</div> : null}
    </div>
  );
}

export default function ReportsPage() {
  const [loadingCounties, setLoadingCounties] = useState(false);
  const [counties, setCounties] = useState<string[]>([]);
  const [countiesError, setCountiesError] = useState<string | null>(null);

  const [countyQuery, setCountyQuery] = useState("");
  const [selectedCounties, setSelectedCounties] = useState<string[]>(["All"]);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingCounties(true);
    setCountiesError(null);
    getReportCounties()
      .then((list) => {
        if (cancelled) return;
        const withAll = list.includes("All") ? list : ["All", ...list];
        setCounties(withAll);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setCountiesError(e instanceof Error ? e.message : "Failed to load counties");
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingCounties(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const countyOptions = useMemo(() => {
    const list = counties.length ? counties : ["All"];
    const deduped = Array.from(new Set(list));
    const sorted = deduped.sort((a, b) => {
      if (a === "All") return -1;
      if (b === "All") return 1;
      return a.localeCompare(b);
    });
    const q = countyQuery.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((c) => c.toLowerCase().includes(q));
  }, [counties, countyQuery]);

  const toggleCounty = (county: string) => {
    setSelectedCounties((prev) => {
      const isSelected = prev.includes(county);
      const next = isSelected ? prev.filter((c) => c !== county) : [...prev, county];

      if (county === "All" && !isSelected) return ["All"];
      if (county !== "All") return next.filter((c) => c !== "All");

      return next.length ? next : ["All"];
    });
  };

  const canDownload = selectedCounties.length > 0 && !downloading;

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadPropertiesReportCsv(selectedCounties);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start justify-between gap-6 mb-6">
          <div>
            <div className="text-2xl font-semibold text-gray-900">Reports</div>
            <div className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Download purpose-built reports. More reports will be added here over time.
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ReportCard
          title="Properties Report"
          description="Download a CSV of properties filtered by county."
          icon={<FileSpreadsheet className="h-5 w-5" />}
          footer={
            <div className="flex items-center justify-between gap-3">
              <Button onClick={handleDownload} disabled={!canDownload} className="gap-2">
                <Download className="h-4 w-4" />
                {downloading ? "Downloading..." : "Download CSV"}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-900">County</div>
            <Input
              value={countyQuery}
              onChange={(e) => setCountyQuery(e.target.value)}
              placeholder="Search county..."
            />
            </div>

            <div className="max-h-[320px] overflow-auto rounded-xl border bg-white p-2">
              {loadingCounties ? (
                <div className="text-sm text-muted-foreground p-2">Loading...</div>
              ) : countyOptions.length === 0 ? (
                <div className="text-sm text-muted-foreground p-2">No county found.</div>
              ) : (
                <div className="space-y-1">
                  {countyOptions.map((county) => {
                    const checked = selectedCounties.includes(county);
                    return (
                      <label
                        key={county}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-muted cursor-pointer"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleCounty(county)}
                        />
                        <span className="text-sm">{county}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {!!countiesError && (
              <div className="text-sm text-destructive">{countiesError}</div>
            )}

            <div className="flex flex-wrap gap-2">
              {selectedCounties.map((c) => (
                <Badge key={c} variant="secondary">
                  {c}
                </Badge>
              ))}
            </div>
          </div>
        </ReportCard>

        <ReportCard
          title="More reports coming soon"
          description="This is a placeholder for future report tiles."
          icon={<Sparkles className="h-5 w-5" />}
          footer={
            <div className="text-xs text-muted-foreground">
              Add new report tiles here as endpoints become available.
            </div>
          }
        >
          <div className="rounded-xl border bg-gray-50/50 p-4 text-sm text-muted-foreground">
            We’ll add more downloadable reports here as they’re built.
          </div>
        </ReportCard>
        </div>
      </div>
    </div>
  );
}

