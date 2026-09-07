import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocation, useNavigate } from "react-router-dom";
import { LogOut, Menu, Settings, User2 } from "lucide-react";
import { logoutUser } from "@/api/api";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/ThemeToggle";
import { HeaderSearch } from "@/components/portal/HeaderSearch";
import { routes } from "@/routes/ROUTES";
import { currentUserCanViewOwnerDashboard } from "@/utils/ownerRole";

const CurrentDate: React.FC = () => {
  const formatDate = (): string => {
    const now = new Date();
    const days = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const dayName = days[now.getDay()];
    const date = now.getDate();
    const month = months[now.getMonth()];
    const year = now.getFullYear();

    const ordinalSuffix = (date: number): string => {
      if (date > 3 && date < 21) return "th";
      switch (date % 10) {
        case 1:
          return "st";
        case 2:
          return "nd";
        case 3:
          return "rd";
        default:
          return "th";
      }
    };

    return `${dayName}, ${date}${ordinalSuffix(date)} ${month} ${year}`;
  };

  return <p>{formatDate()}</p>;
};

interface DashboardHeaderProps {
  label: string;
  desc: string;
}

const headerEntries: { prefix: string; label: string; desc: string }[] = [
  {
    prefix: "profile",
    label: "Profile",
    desc: "Your name, email, and password.",
  },
  {
    prefix: "settings",
    label: "Settings",
    desc: "Brevo, Supabase, and DocuSign.",
  },
  {
    prefix: "owner",
    label: "Owner",
    desc: "Billed vs collected, unpaid, and protest results.",
  },
  {
    prefix: "csv-uploads",
    label: "CSV uploads",
    desc: "Import property and hearing data from spreadsheets.",
  },
  {
    prefix: "hearings",
    label: "Hearings",
    desc: "View and filter scheduled property hearings.",
  },
  {
    prefix: "invoices",
    label: "Invoices",
    desc: "Track billed, unpaid, and paid invoices.",
  },
  {
    prefix: "invoice",
    label: "Invoice",
    desc: "Review and send this invoice.",
  },
  {
    prefix: "properties",
    label: "Properties",
    desc: "Search, filter, and manage protest properties.",
  },
  {
    prefix: "add-property",
    label: "Add property",
    desc: "Create a property and attach it to a client or prospect.",
  },
  {
    prefix: "edit-properties",
    label: "Edit property",
    desc: "Update account, address, and yearly protest data.",
  },
  {
    prefix: "property",
    label: "Property",
    desc: "Yearly data, hearings, and documents for this account.",
  },
  {
    prefix: "clients",
    label: "Clients",
    desc: "Search, open, or add clients.",
  },
  {
    prefix: "client",
    label: "Client",
    desc: "Properties, invoices, and contract for this client.",
  },
  {
    prefix: "edit-client",
    label: "Edit client",
    desc: "Update contact and billing details.",
  },
  {
    prefix: "prospects",
    label: "Prospects",
    desc: "Track outreach and convert prospects to clients.",
  },
  {
    prefix: "prospect",
    label: "Prospect",
    desc: "Contact details, properties, and documents.",
  },
  {
    prefix: "edit-prospect",
    label: "Edit prospect",
    desc: "Update prospect contact details.",
  },
  {
    prefix: "contract",
    label: "Contract",
    desc: "Create and send a client contract.",
  },
  {
    prefix: "agent",
    label: "Appointment of Agent",
    desc: "Create and send Form 50-162.",
  },
  {
    prefix: "aoa",
    label: "Appointment of Agent",
    desc: "Create and send Form 50-162.",
  },
];

function resolveHeader(path: string, username: string): DashboardHeaderProps {
  if (!path || path === "dashboard") {
    return {
      label: `Welcome, ${username}`,
      desc: "Clients, prospects, and hearings at a glance.",
    };
  }
  const match = headerEntries.find(
    (item) => path === item.prefix || path.startsWith(`${item.prefix}/`)
  );
  return match ?? { label: username, desc: "" };
}

const DashboardHeader = ({ onMenuToggle }: { onMenuToggle: () => void }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname.replace(/^\/portal\/?/, "").split("?")[0] ?? "";
  const username = localStorage.getItem("username") || "User";
  const currentHeader = resolveHeader(currentPath, username);

  const showHeaderSearch =
    currentPath !== "" &&
    currentPath !== "dashboard" &&
    currentPath !== "csv-uploads";

  async function logoutHandler() {
    try {
      await logoutUser();
    } catch {
      localStorage.removeItem("token");
      localStorage.removeItem("username");
      localStorage.removeItem("user");
      localStorage.removeItem("email");
    }
    toast({ title: "Logged out" });
    navigate("/login");
  }

  return (
    <header className="flex w-full items-center gap-3 pl-4 pr-2 sm:pl-6 sm:pr-3 py-3 border-b border-border bg-background/90 backdrop-blur-md">
      <button
        type="button"
        className="sm:hidden p-2 rounded-md text-foreground hover:bg-muted"
        onClick={onMenuToggle}
        aria-label="Open menu"
      >
        <Menu size={24} />
      </button>
      <div className="min-w-0 shrink-0 max-w-[10rem] sm:max-w-[14rem] lg:max-w-[18rem]">
        <HeaderDescriptionItem label={currentHeader.label} desc={currentHeader.desc} />
      </div>
      {showHeaderSearch ? (
        <HeaderSearch className="ml-auto w-1/2 shrink-0" />
      ) : (
        <div className="ml-auto" />
      )}
      <div className="flex items-center gap-2 shrink-0">
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="text-sm flex items-center gap-2 border border-border bg-card px-2 py-1.5 rounded-lg hover:bg-muted transition-colors"
              aria-label="Account menu"
            >
              <User2 size={18} aria-hidden />
              <span className="hidden sm:inline max-w-[10rem] truncate">{username}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[10rem]">
            <DropdownMenuItem
              className="gap-2"
              onClick={() => navigate(routes.profile())}
            >
              <User2 className="h-4 w-4" aria-hidden />
              Profile
            </DropdownMenuItem>
            {currentUserCanViewOwnerDashboard() ? (
              <DropdownMenuItem
                className="gap-2"
                onClick={() => navigate(routes.settings())}
              >
                <Settings className="h-4 w-4" aria-hidden />
                Settings
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logoutHandler} className="gap-2">
              <LogOut className="h-4 w-4" aria-hidden />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

const HeaderDescriptionItem = ({ label, desc }: DashboardHeaderProps) => {
  return (
    <div className="min-w-0">
      <h1 className="font-semibold text-lg sm:text-xl tracking-tight truncate">{label}</h1>
      {desc ? (
        <p className="text-sm text-muted-foreground truncate hidden sm:block">{desc}</p>
      ) : (
        <div className="text-sm text-muted-foreground hidden sm:block">
          <CurrentDate />
        </div>
      )}
    </div>
  );
};

export default DashboardHeader;
