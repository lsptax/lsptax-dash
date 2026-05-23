import { useState } from "react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { changeProspectStatus } from "@/api/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { normalizeProspectStatus } from "@/store/prospects";
import { Prospect } from "@/types/types";

const statusColors: Record<string, string> = {
  NOT_CONTACTED: "bg-red-100 text-red-800 hover:bg-red-200",
  CONTACTED: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
  IN_PROGRESS: "bg-green-100 text-green-800 hover:bg-green-200",
  SIGNED: "bg-blue-100 text-blue-800 hover:bg-blue-200",
};

export function ProspectStatusCell({
  prospect,
  onSuccess,
}: {
  prospect: Prospect;
  onSuccess?: () => void;
}) {
  const { toast } = useToast();
  const status = normalizeProspectStatus(prospect as unknown as Record<string, unknown>);
  const [selectedStatus, setSelectedStatus] = useState(status);

  const handleStatusChange = async (newStatus: string) => {
    try {
      await changeProspectStatus({
        prospectId: prospect.id,
        newStatus,
      });
      toast({
        title: "Status updated successfully",
        description: `Prospect status changed to ${newStatus}`,
      });
      onSuccess?.();
    } catch {
      toast({
        variant: "destructive",
        title: "Failed to update status",
        description: "Please try again",
      });
    }
  };

  const isStatusChangeAllowed =
    status === "NOT_CONTACTED" || status === "CONTACTED";

  const statusClassName =
    statusColors[status as keyof typeof statusColors] ?? "bg-gray-100 text-gray-800";

  const statusLabel = status;

  if (!isStatusChangeAllowed) {
    return (
      <span
        className={cn(
          "inline-flex h-8 items-center rounded-md border border-input px-3 text-sm font-medium shadow-sm",
          statusClassName,
        )}
      >
        {statusLabel}
      </span>
    );
  }

  return (
    <div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(statusClassName, "hover:opacity-90")}
          >
            {statusLabel}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Select the Current Status</AlertDialogTitle>
            <AlertDialogDescription>
              <RadioGroup
                defaultValue={status}
                onValueChange={setSelectedStatus}
                className="mt-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="NOT_CONTACTED" id="not_contacted" />
                  <Label htmlFor="not_contacted">Not Contacted</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="CONTACTED" id="contacted" />
                  <Label htmlFor="contacted">Contacted</Label>
                </div>
              </RadioGroup>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleStatusChange(selectedStatus)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Save Status
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
