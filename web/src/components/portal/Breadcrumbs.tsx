import { Link, useLocation } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { PORTAL_BASE, routes } from "@/routes/ROUTES";

const ROUTE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  properties: "Properties",
  "add-property": "Add Property",
  property: "Property Details",
  "edit-properties": "Edit Property",
  clients: "Clients",
  "list-client": "Clients",
  "add-client": "Add Client",
  "move-from-prospect": "Move to Client",
  client: "Client Details",
  "edit-client": "Edit Client",
  "move_to_client": "Move to Client",
  prospects: "Prospects",
  "list-prospect": "Prospects",
  "add-prospect": "Add Prospect",
  prospect: "Prospect Details",
  contract: "Contract",
  "preview-docs": "Preview Documents",
  "edit-prospect": "Edit Prospect",
  "edit-prospect-properties": "Edit Prospect Properties",
  hearings: "Hearings",
  invoices: "Invoices",
  invoice: "Invoice",
  aoa: "AOA",
  agent: "Agent",
  "csv-uploads": "CSV Uploads",
};

function pathSegmentToLabel(segment: string): string {
  return ROUTE_LABELS[segment] ?? segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function Breadcrumbs() {
  const location = useLocation();
  const pathname = location.pathname;
  if (!pathname.startsWith(`${PORTAL_BASE}/`) && pathname !== PORTAL_BASE) return null;

  const segments = pathname.replace(/^\/portal\/?/, "").split("/").filter(Boolean);
  if (segments.length === 0) return null;

  const crumbs: { path: string; label: string }[] = [
    { path: routes.dashboard(), label: "Dashboard" },
  ];
  let acc = PORTAL_BASE;
  const isOnlyDashboard = segments.length === 1 && segments[0] === "dashboard";
  if (!isOnlyDashboard) {
    for (let i = 0; i < segments.length; i++) {
      acc += `/${segments[i]}`;
      crumbs.push({ path: acc, label: pathSegmentToLabel(segments[i]) });
    }
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground mb-4 px-4">
      {crumbs.map((crumb, index) => (
        <span key={crumb.path} className="flex items-center gap-1">
          {index > 0 && <ChevronRight className="h-4 w-4 flex-shrink-0" aria-hidden />}
          {index === crumbs.length - 1 ? (
            <span className="font-medium text-foreground" aria-current="page">
              {crumb.label}
            </span>
          ) : (
            <Link to={crumb.path} className="hover:text-foreground hover:underline">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
