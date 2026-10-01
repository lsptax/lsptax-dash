import { useState } from "react";
import { FileDown, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getClientInvoiceSummary, getClientInvoiceSummaryYears } from "@/store/invoices";
import { downloadInvoiceSummaryPdf } from "@/utils/invoiceSummaryPdf";

export function DownloadInvoiceSummaryButton({ clientId }: { clientId: number }) {
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);
  const [years, setYears] = useState<number[]>([]);
  const [year, setYear] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  const downloadYear = async (selectedYear: number) => {
    setDownloading(true);
    try {
      const summary = await getClientInvoiceSummary(clientId, selectedYear);
      if (summary.rows.length === 0) {
        toast({
          title: "Nothing to download",
          description: `No invoices found for ${selectedYear}.`,
          variant: "destructive",
        });
        return;
      }
      await downloadInvoiceSummaryPdf(summary);
      setPickerOpen(false);
    } catch (error) {
      toast({
        title: "Could not download invoice summary",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleClick = async () => {
    setDownloading(true);
    try {
      const availableYears = await getClientInvoiceSummaryYears(clientId);
      if (availableYears.length === 0) {
        toast({
          title: "Nothing to download",
          description: "This client has no invoices.",
          variant: "destructive",
        });
        return;
      }
      if (availableYears.length === 1) {
        await downloadYear(availableYears[0]);
        return;
      }
      setYears(availableYears);
      setYear(String(availableYears[0]));
      setPickerOpen(true);
    } catch (error) {
      toast({
        title: "Could not download invoice summary",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={downloading}
        onClick={() => void handleClick()}
      >
        {downloading ? <LoaderCircle className="animate-spin" /> : <FileDown />}
        Download Invoice Summary
      </Button>
      <Dialog open={pickerOpen} onOpenChange={(next) => !downloading && setPickerOpen(next)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Download invoice summary</DialogTitle>
            <DialogDescription>Choose the tax year to include in the PDF.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="invoice-summary-year">Tax year</Label>
            <Select value={year} onValueChange={setYear} disabled={downloading}>
              <SelectTrigger id="invoice-summary-year">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={downloading}
              onClick={() => setPickerOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={downloading || !year}
              onClick={() => void downloadYear(Number(year))}
            >
              {downloading ? "Downloading…" : "Download"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
