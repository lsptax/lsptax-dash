import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Archive } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { setInvoicesArchived } from "@/store/invoices";
import { useToast } from "@/hooks/use-toast";
import { defaultInvoiceListYears } from "./invoiceListSearchParams";

export function InvoiceActionsCell({
  yearInvoices,
  years,
  isArchived,
}: {
  yearInvoices?: Array<{ id: string | number; year: number }>;
  /** Years chosen in the list filter. Empty means all years, which archives the current year only. */
  years?: number[];
  isArchived?: boolean;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const targetYears = years?.length ? years : defaultInvoiceListYears();
  const yearLabel = targetYears.join(", ");

  const setArchived = async (archived: boolean) => {
    const ids = [
      ...new Set(
        (yearInvoices ?? [])
          .filter((entry) => targetYears.includes(Number(entry.year)))
          .map((entry) => Number(entry.id))
          .filter((invoiceId) => Number.isFinite(invoiceId))
      ),
    ];
    if (!ids.length) {
      throw new Error(`No ${yearLabel} invoice on this row`);
    }
    await setInvoicesArchived({ invoiceIds: ids, isArchived: archived, years: targetYears });
    await queryClient.invalidateQueries({ queryKey: ["invoices"] });
  };

  const handleArchive = async () => {
    try {
      await setArchived(true);
      toast({
        title: "✓ Invoice archived successfully",
        description: `The ${yearLabel} invoice has been archived.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to archive the invoice",
        description: error instanceof Error ? error.message : "An unexpected error occurred. Please try again.",
      });
    }
  };

  const handleMoveToActive = async () => {
    try {
      await setArchived(false);
      toast({
        title: "✓ Invoice moved to active successfully",
        description: `The ${yearLabel} invoice is now active.`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to move the invoice to active",
        description: error instanceof Error ? error.message : "An unexpected error occurred. Please try again.",
      });
    }
  };

  return (
    <div className="flex gap-2">
      {!isArchived ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" aria-label="Archive invoice">
              <Archive size={8} />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Archive Invoice</AlertDialogTitle>
              <AlertDialogDescription>
                Archive the {yearLabel} invoice only. Other years on this property stay unchanged.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleArchive}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Archive
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm">
              Move to Active
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Move Invoice to Active</AlertDialogTitle>
              <AlertDialogDescription>
                Move the {yearLabel} invoice back to active. Other years on this property stay unchanged.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleMoveToActive}
                className="bg-green-600 hover:bg-green-700"
              >
                Move to Active
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
