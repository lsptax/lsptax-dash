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
import { archiveItem } from "@/api/api";
import { useToast } from "@/hooks/use-toast";

export function InvoiceActionsCell({
  id,
  isArchived,
}: {
  id: string | number;
  isArchived?: boolean;
}) {
  const { toast } = useToast();

  const handleArchive = async () => {
    try {
      await archiveItem("invoice", Number(id));
      toast({
        title: "✓ Invoice archived successfully",
        description: "The invoice has been archived.",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Failed to archive the invoice",
        description: "An unexpected error occurred. Please try again.",
      });
    }
  };

  const handleMoveToActive = async () => {
    try {
      await archiveItem("invoice", Number(id));
      toast({
        title: "✓ Invoice moved to active successfully",
        description: "The invoice is now active.",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Failed to move the invoice to active",
        description: "An unexpected error occurred. Please try again.",
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
                Are you sure you want to archive this invoice (#{id})? This action can
                be undone by restoring the invoice later.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleArchive}
                className="bg-blue-600 hover:bg-blue-700"
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
                Are you sure you want to move this invoice (#{id}) to active?
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
