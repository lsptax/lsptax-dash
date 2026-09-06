import { ArrowLeft } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";

function isSafeReturnTo(path: string): boolean {
  return path.startsWith("/portal/") && !path.includes("//");
}

function backLabelForPath(path: string, fallbackLabel: string): string {
  const pathname = path.split("?")[0];

  if (pathname.includes("/invoices")) return "Back to invoices";
  if (pathname.includes("/list-client")) return "Back to clients";
  if (pathname.endsWith("/client")) return "Back to client";
  if (pathname.includes("/properties")) return "Back to properties";
  if (pathname.endsWith("/property")) return "Back to property";
  if (pathname.includes("/hearings")) return "Back to hearings";
  if (pathname.includes("/list-prospect")) return "Back to prospects";
  if (pathname.includes("/prospect")) return "Back to prospect";

  return fallbackLabel;
}

type BackToListLinkProps = {
  fallback: string;
  label?: string;
  variant?: "link" | "button";
  className?: string;
};

export function BackToListLink({
  fallback,
  label = "Back",
  variant = "button",
  className,
}: BackToListLinkProps) {
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const to = returnTo && isSafeReturnTo(returnTo) ? returnTo : fallback;
  const displayLabel =
    returnTo && isSafeReturnTo(returnTo)
      ? backLabelForPath(returnTo, label)
      : label;

  if (variant === "link") {
    return (
      <Link to={to} className={className}>
        {displayLabel}
      </Link>
    );
  }

  return (
    <Button asChild variant="outline" className={className}>
      <Link to={to}>
        <ArrowLeft className="h-4 w-4" />
        {displayLabel}
      </Link>
    </Button>
  );
}
