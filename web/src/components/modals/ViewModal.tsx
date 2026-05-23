import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type ViewModalProps<T> = {
  isOpen: boolean;
  onClose: () => void;
  data: T; // This allows the modal to accept any data type
  renderData: (data: T) => JSX.Element; // A function to render the data
};

const ViewModal = <T,>({
  isOpen,
  onClose,
  data,
  renderData,
}: ViewModalProps<T>) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>View Details</DialogTitle>
          <DialogDescription>{renderData(data)}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-end space-x-4">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViewModal;
