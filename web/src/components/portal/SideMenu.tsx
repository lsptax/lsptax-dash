import React, { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Building,
  FileText,
  Users,
  UserPlus,
  UploadCloud,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Wallet,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import sidebarMark from "@/assets/dashboard/sidebar-mark.png";
import { routes } from "@/routes/ROUTES";
import { currentUserCanViewOwnerDashboard } from "@/utils/ownerRole";
import { cn } from "@/lib/utils";

const SIDEBAR_KEY = "lsptax-sidebar-open";

interface MenuOption {
  to: string;
  /** Path segment after /portal/ for active matching */
  match: string;
  label: string;
  icon: React.ElementType;
  ownerOnly?: boolean;
}

const menuOptions: MenuOption[] = [
  { to: routes.dashboard(), match: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: routes.owner(), match: "owner", label: "Finances", icon: Wallet, ownerOnly: true },
  { to: routes.clients.list(), match: "clients", label: "Clients", icon: Users },
  { to: routes.properties.list(), match: "properties", label: "Properties", icon: Building },
  { to: routes.invoices.list(), match: "invoices", label: "Invoices", icon: FileText },
  { to: routes.hearings.list(), match: "hearings", label: "Hearings", icon: Calendar },
  { to: routes.prospects.list(), match: "prospects", label: "Prospects", icon: UserPlus },
  { to: routes.csvUploads(), match: "csv-uploads", label: "CSV Uploads", icon: UploadCloud },
];

const SideMenu: React.FC = () => {
  const location = useLocation();
  const pathTail = location.pathname.replace(/^\/portal\/?/, "").split("?")[0] ?? "";
  const [isOpen, setIsOpen] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) !== "false";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, String(isOpen));
    } catch {
      /* ignore */
    }
  }, [isOpen]);

  return (
    <TooltipProvider>
      <div
        className={cn(
          "h-full bg-card text-card-foreground transition-all border-r border-border flex flex-col items-center",
          isOpen ? "w-64" : "w-16"
        )}
      >
        <button
          type="button"
          className="self-end mr-2 mt-2 p-2 rounded-md bg-muted hover:bg-accent transition-colors"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>

        <NavLink
          to={routes.dashboard()}
          aria-label="Lone Star Property Tax portal"
          className={cn(
            "mt-3 mb-1 flex rounded-lg px-3 py-2 transition-colors hover:bg-muted/60",
            isOpen ? "w-full flex-col items-center gap-2.5" : "items-center justify-center"
          )}
        >
          <img
            src={sidebarMark}
            alt=""
            className={cn("object-contain object-bottom", isOpen ? "h-14 w-14" : "h-8 w-8")}
          />
          {isOpen ? (
            <div className="text-center">
              <p className="text-sm font-semibold leading-snug tracking-tight text-foreground">
                Lone Star Property Tax
              </p>
              <p className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Portal
              </p>
            </div>
          ) : (
            <span className="sr-only">Lone Star Property Tax portal</span>
          )}
        </NavLink>

        <nav className="flex flex-col w-full mt-6 overflow-hidden px-2" aria-label="Portal">
          {menuOptions
            .filter((option) => !option.ownerOnly || currentUserCanViewOwnerDashboard())
            .map(({ to, match, label, icon: Icon }) => {
            const isActive =
              pathTail === match || pathTail.startsWith(`${match}/`);

            return (
              <Tooltip key={to}>
                <TooltipTrigger asChild>
                  <NavLink
                    to={to}
                    className={cn(
                      "relative flex items-center rounded-lg transition-colors my-0.5",
                      isActive
                        ? "bg-accent text-foreground font-semibold"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      isOpen ? "justify-start gap-3 px-3 py-2.5" : "justify-center p-2.5"
                    )}
                  >
                    {isActive && (
                      <span
                        className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-foreground/70"
                        aria-hidden
                      />
                    )}
                    <Icon size={22} className={isActive ? "text-foreground" : ""} />
                    {isOpen && <span>{label}</span>}
                  </NavLink>
                </TooltipTrigger>
                {!isOpen && (
                  <TooltipContent side="right">{label}</TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </nav>
      </div>
    </TooltipProvider>
  );
};

export default SideMenu;
