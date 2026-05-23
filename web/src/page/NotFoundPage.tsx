import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { routes } from "@/routes/ROUTES";
import { FileQuestion } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div
      className="flex flex-col items-center justify-center min-h-[60vh] px-4"
      role="status"
      aria-label="Page not found"
    >
      <FileQuestion className="h-16 w-16 text-muted-foreground mb-4" aria-hidden />
      <h1 className="text-2xl font-bold text-foreground mb-2">Page not found</h1>
      <p className="text-muted-foreground text-center mb-6 max-w-md">
        The page you’re looking for doesn’t exist or you don’t have access to it.
      </p>
      <Link to={routes.dashboard()}>
        <Button variant="blue">Back to Dashboard</Button>
      </Link>
    </div>
  );
}
