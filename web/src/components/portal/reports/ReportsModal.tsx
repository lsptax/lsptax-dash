import { useEffect, useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { downloadPropertiesReportCsv, getReportCounties } from "@/api/api";

type ReportsModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function ReportsModal({ isOpen, onClose }: ReportsModalProps) {
  const [loadingCounties, setLoadingCounties] = useState(false);
  const [counties, setCounties] = useState<string[]>([]);
  const [countiesError, setCountiesError] = useState<string | null>(null);

  const [selectedCounties, setSelectedCounties] = useState<string[]>(["All"]);
  const [countyQuery, setCountyQuery] = useState("");
  const [downloading, setDownloading] = useState(false);
  const canDownload = selectedCounties.length > 0;

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setLoadingCounties(true);
    setCountiesError(null);
    getReportCounties()
      .then((list) => {
        if (cancelled) return;
        setCounties(list);
        if (list.includes("All")) return;
        setCounties((prev) => ["All", ...prev]);
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
  }, [isOpen]);

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

      // If "All" is selected, keep it as the only value.
      if (county === "All" && !isSelected) return ["All"];

      // If selecting a specific county, remove "All".
      if (county !== "All") return next.filter((c) => c !== "All");

      return next.length ? next : ["All"];
    });
  };

  const removeSelectedCounty = (county: string) => {
    setSelectedCounties((prev) => {
      const next = prev.filter((c) => c !== county);
      return next.length ? next : ["All"];
    });
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await downloadPropertiesReportCsv(selectedCounties);
      onClose();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Reports</DialogTitle>
          <DialogDescription>
            Select county (multi-select), then download the report.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <div className="text-sm font-medium">County</div>

            <div className="space-y-2">
              <Input
                value={countyQuery}
                onChange={(e) => setCountyQuery(e.target.value)}
                placeholder="Search county..."
              />

              <div className="max-h-[240px] overflow-auto rounded-md border p-2">
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
                          className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted cursor-pointer"
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
            </div>

            {!!countiesError && (
              <div className="text-sm text-destructive">{countiesError}</div>
            )}

            {selectedCounties.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {selectedCounties.map((c) => (
                  <Badge key={c} variant="secondary" className="gap-1">
                    {c}
                    {c !== "All" && (
                      <button
                        type="button"
                        className="ml-1 rounded hover:bg-muted p-0.5"
                        aria-label={`Remove ${c}`}
                        onClick={() => removeSelectedCounty(c)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border p-3 space-y-2">
            <div className="font-medium">Properties Report</div>
            <div className="text-sm text-muted-foreground">
              Downloads a CSV of properties filtered by county.
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={downloading}>
            Cancel
          </Button>
          <Button onClick={handleDownload} disabled={!canDownload || downloading}>
            {downloading ? "Downloading..." : "Download"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

