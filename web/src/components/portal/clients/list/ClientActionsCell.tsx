import { Button } from "@/components/ui/button";
import { Trash2, Archive } from "lucide-react";
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
import { deleteClient, archiveItem } from "@/api/api";
import { useToast } from "@/hooks/use-toast";

export type ClientRow = {
  isArchived: boolean;
  clientId: string;
  clientNumber: string;
  clientName: string;
  email: string;
  type: string;
  mobile: string;
};

export function ClientActionsCell({
  clientNum,
  clientId,
  clientName,
  isArchived,
}: {
  clientNum: string;
  clientId: string;
  clientName: string;
  isArchived: boolean;
}) {
  const { toast } = useToast();

  const handleDelete = async () => {
    try {
      await deleteClient(Number(clientId));
      toast({
        title: "✓ Client deleted successfully",
        description: "The client has been deleted from the system.",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Failed to delete the client",
        description: "An unexpected error occurred. Please try again.",
      });
    }
  };

  const handleArchive = async () => {
    try {
      await archiveItem("client", Number(clientId));
      toast({
        title: "✓ Client archived successfully",
        description: "The client has been archived.",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Failed to archive the client",
        description: "An unexpected error occurred. Please try again.",
      });
    }
  };

  const handleMoveToActive = async () => {
    try {
      await archiveItem("client", Number(clientId));
      toast({
        title: "✓ Client moved to active successfully",
        description: "The client is now active.",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Failed to move the client to active",
        description: "An unexpected error occurred. Please try again.",
      });
    }
  };

  return (
    <div className="flex gap-2">
      {!isArchived ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" aria-label="Archive client">
              <Archive size={8} />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Archive Client</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to archive client {clientName} (#{clientNum}
                )? This action can be undone by restoring the client later.
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
        <>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm">
                Move to Active
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Move Client to Active</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to move client {clientName} (#{clientNum}) to
                  active?
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
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" aria-label="Delete client">
                <Trash2 size={8} />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Client</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete client {clientName} (#{clientId}) and
                  all associated properties and invoices. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}
