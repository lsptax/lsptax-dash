import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const ActionModal = ({
  isOpen,
  onClose,
  onAction, // Callback function passed as a prop for the action (archive/unarchive)
  title,
  description,
  actionType, // Dynamic action type (e.g., "Archive" or "Unarchive")
}: {
  isOpen: boolean;
  onClose: () => void;
  onAction: () => void; // Define the callback type for the action
  title: string;
  description: string;
  actionType: "Archive" | "Unarchive"; // Specify possible actions
}) => {
  const handleAction = () => {
    onAction(); // Trigger the onAction function passed from the parent component
    onClose(); // Close the modal after the action is performed
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-end space-x-4">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleAction}>
            {actionType} {/* Dynamically render action type */}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ActionModal;
