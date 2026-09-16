import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { pickString } from "@/utils/clientContact";

function getProspectDisplayName(prospect: Prospect | Record<string, unknown>): string {
  const r = prospect as Record<string, unknown>;
  return pickString(r.clientName, r.prospectName, r.name);
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
  const [moveOpen, setMoveOpen] = useState(false);
  const [clientNumber, setClientNumber] = useState("");
  const [converting, setConverting] = useState(false);

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
    const trimmedNumber = clientNumber.trim();
    if (!trimmedNumber) {
      toast({
        variant: "destructive",
        title: "Client number required",
        description: "Enter a client number before converting this prospect.",
      });
      return;
    }

    setConverting(true);
    try {
      const newClient = await moveProspectToClient(prospect.id, trimmedNumber);
      toast({
        title: "Success",
        description: "Prospect successfully converted to client.",
      });
      setMoveOpen(false);
      const clientPageParam =
        newClient?.id != null && String(newClient.id) !== ""
          ? String(newClient.id)
          : trimmedNumber;
      navigate(routes.client.detail(clientPageParam));
    } catch (error) {
      console.error("Error converting prospect to client:", error);
      toast({
        variant: "destructive",
        title: "Conversion Failed",
        description:
          error instanceof Error
            ? error.message
            : "Could not convert prospect to client. Please try again.",
      });
    } finally {
      setConverting(false);
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

      <AlertDialog
        open={moveOpen}
        onOpenChange={(open) => {
          if (converting) return;
          setMoveOpen(open);
          if (open) setClientNumber("");
        }}
      >
        <AlertDialogTrigger asChild>
          <Button variant="default" size="icon" aria-label="Move to client">
            <UserRoundPlus className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move to Client</AlertDialogTitle>
            <AlertDialogDescription>
              Convert {getProspectDisplayName(prospect)} to a client? Enter a
              client number. This archives the prospect and copies its
              properties onto the new client.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-2">
            <Label htmlFor={`convert-client-number-${prospect.id}`}>
              Client number
            </Label>
            <Input
              id={`convert-client-number-${prospect.id}`}
              value={clientNumber}
              onChange={(event) => setClientNumber(event.target.value)}
              placeholder="e.g. 100"
              autoComplete="off"
              disabled={converting}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={converting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={converting || !clientNumber.trim()}
              onClick={(event) => {
                event.preventDefault();
                void handleMoveToClient();
              }}
            >
              {converting ? "Converting..." : "Convert to Client"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
