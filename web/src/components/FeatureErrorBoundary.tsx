import { type ReactNode } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Button } from "@/components/ui/button";

type FeatureErrorBoundaryProps = {
  children: ReactNode;
  /** Shown in the compact fallback (e.g. "Dashboard tables"). */
  label?: string;
};

/**
 * Smaller error UI for sections inside the portal (vs full-page root boundary).
 */
export function FeatureErrorBoundary({
  children,
  label = "This section",
}: FeatureErrorBoundaryProps) {
  return (
    <ErrorBoundary
      fallback={
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center space-y-3 m-4">
          <p className="text-sm font-medium text-destructive">
            {label} couldn&apos;t render. You can reload the page or go back and
            try again.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
          >
            Reload page
          </Button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
