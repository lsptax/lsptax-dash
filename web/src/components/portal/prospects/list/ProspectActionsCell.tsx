import { Button } from "@/components/ui/button";
import { Trash2, UserRoundPlus } from "lucide-react";
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
import { deleteProspect, moveProspectToClient } from "@/api/api";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { routes } from "@/routes/ROUTES";
import { Prospect } from "@/types/types";

function getProspectDisplayName(prospect: Prospect | Record<string, unknown>): string {
  const r = prospect as Record<string, unknown>;
  return (r.clientName as string) ?? (r.prospectName as string) ?? (r.name as string) ?? "";
}

export function ProspectActionsCell({
  prospect,
  onSuccess,
}: {
  prospect: Prospect;
  onSuccess?: () => void;
}) {
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleDelete = async () => {
    try {
      await deleteProspect(Number(prospect.id));
      toast({
        title: "Prospect deleted successfully",
        description: "The prospect has been removed from the system",
      });
      onSuccess?.();
    } catch {
      toast({
        variant: "destructive",
        title: "Failed to delete prospect",
        description: "Please try again",
      });
    }
  };

  const handleMoveToClient = async () => {
    try {
      const newClient = await moveProspectToClient(prospect.id);
      toast({
        title: "Success",
        description: "Prospect successfully converted to client.",
      });
      navigate(routes.client.detail(newClient.clientNumber));
    } catch (error) {
      console.error("Error converting prospect to client:", error);
      toast({
        variant: "destructive",
        title: "Conversion Failed",
        description: "Could not convert prospect to client. Please try again.",
      });
    }
  };

  return (
    <div className="flex gap-2">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="icon" aria-label="Delete prospect">
            <Trash2 className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Prospect</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete prospect{" "}
              {getProspectDisplayName(prospect)}? This action cannot be undone.
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

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="default" size="icon" aria-label="Move to client">
            <UserRoundPlus className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move to Client</AlertDialogTitle>
            <AlertDialogDescription>
              Convert {getProspectDisplayName(prospect)} to a client? This will move
              all prospect information to a new client record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMoveToClient}>
              Convert to Client
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
