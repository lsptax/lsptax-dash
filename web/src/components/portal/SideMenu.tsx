import React, { useState } from "react";
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
  BarChart3,
  Calendar,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import mainLogo from "@/assets/dashboard/main-logo.svg";
import { routes } from "@/routes/ROUTES";

interface MenuOption {
  to: string;
  /** Path segment after /portal/ for active matching */
  match: string;
  label: string;
  icon: React.ElementType;
}

const menuOptions: MenuOption[] = [
  { to: routes.dashboard(), match: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: routes.clients.list(), match: "clients", label: "Clients", icon: Users },
  { to: routes.properties.list(), match: "properties", label: "Properties", icon: Building },
  { to: routes.invoices.list(), match: "invoices", label: "Invoices", icon: FileText },
  { to: routes.hearings.list(), match: "hearings", label: "Hearings", icon: Calendar },
  { to: routes.prospects.list(), match: "prospects", label: "Prospects", icon: UserPlus },
  { to: routes.csvUploads(), match: "csv-uploads", label: "CSV Uploads", icon: UploadCloud },
  { to: routes.reports(), match: "reports", label: "Reports", icon: BarChart3 },
];

const SideMenu: React.FC = () => {
  const location = useLocation();
  const pathTail = location.pathname.replace(/^\/portal\/?/, "").split("?")[0] ?? "";
  const [isOpen, setIsOpen] = useState(true);

  return (
    <TooltipProvider>
      <div
        className={`h-full bg-white transition-all border-r flex flex-col items-center ${
          isOpen ? "w-64" : "w-16"
        }`}
      >
        <button
          type="button"
          className="self-end mr-2 p-2 rounded-md bg-gray-100 hover:bg-gray-200 transition"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isOpen ? <ChevronLeft size={24} /> : <ChevronRight size={24} />}
        </button>

        <div className={`mt-6 transition-all ${isOpen ? "w-24" : "w-12"}`}>
          <img src={mainLogo} alt="Lone Star Property Tax portal logo" className="w-full" />
        </div>

        <div className="flex flex-col w-full mt-8 overflow-hidden">
          {menuOptions.map(({ to, match, label, icon: Icon }) => {
            const isActive =
              pathTail === match || pathTail.startsWith(`${match}/`);

            return (
              <Tooltip key={to}>
                <TooltipTrigger asChild>
                  <NavLink
                    to={to}
                    className={`flex items-center p-4 rounded-lg transition-all ${
                      isActive
                        ? "bg-brand-muted text-brand-secondary font-semibold"
                        : "text-gray-700 hover:bg-gray-100"
                    } ${isOpen ? "justify-start gap-3 px-6" : "justify-center"}`}
                  >
                    <Icon
                      size={24}
                      className={`${
                        isActive ? "text-brand-secondary" : "text-gray-600"
                      }`}
                    />
                    {isOpen && <span>{label}</span>}
                  </NavLink>
                </TooltipTrigger>
                {!isOpen && (
                  <TooltipContent side="right">{label}</TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default SideMenu;
