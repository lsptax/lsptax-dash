import { useState } from "react";
import { deleteHearing } from "@/api/api";
import { Button } from "@/components/ui/button";
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
import { useToast } from "@/hooks/use-toast";
import { LoaderCircle, Trash2 } from "lucide-react";

interface HearingDeleteButtonProps {
  hearingId: number;
  onSuccess?: () => void;
  variant?: "icon" | "button";
  disabled?: boolean;
}

export function HearingDeleteButton({
  hearingId,
  onSuccess,
  variant = "icon",
  disabled,
}: HearingDeleteButtonProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteHearing(hearingId);
      toast({
        title: "Hearing removed",
        description: "Removed from lists and dashboard stats. The record is kept in the database.",
      });
      setOpen(false);
      onSuccess?.();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Could not remove hearing",
        description: err instanceof Error ? err.message : "Try again.",
      });
    } finally {
      setDeleting(false);
    }
  };

  const trigger =
    variant === "button" ? (
      <Button type="button" variant="outline" size="sm" className="text-red-600 hover:text-red-700" disabled={disabled || deleting}>
        {deleting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        <span className="ml-1.5">Remove</span>
      </Button>
    ) : (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-red-600 hover:text-red-700"
        disabled={disabled || deleting}
        aria-label="Remove hearing"
      >
        {deleting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      </Button>
    );

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove this hearing?</AlertDialogTitle>
          <AlertDialogDescription>
            This soft-deletes the hearing: it will disappear from the Hearings table, property calendar, and
            dashboard counts. The row stays in the database for audit purposes and cannot be restored from the app.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-600 hover:bg-red-700"
            disabled={deleting}
            onClick={(e) => {
              e.preventDefault();
              void handleDelete();
            }}
          >
            {deleting ? "Removing…" : "Remove hearing"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
