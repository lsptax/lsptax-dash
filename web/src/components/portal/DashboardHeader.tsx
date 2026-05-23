import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocation } from "react-router-dom";
import { BellIcon, Menu, User2 } from "lucide-react";
import { logoutUser } from "@/api/api";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

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

    // Add ordinal suffix (st, nd, rd, th)
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

  return <h3>{formatDate()}</h3>;
};

interface DashboardHeaderProps {
  icon: string;
  label: string;
  desc: string;
}

const headerData = [
  {
    id: "properties",
    icon: "",
    label: "Properties",
    desc: "See all Properties here.",
  },
  {
    id: "invoices",
    icon: "",
    label: "Invoices",
    desc: "See all Invoices here.",
  },
  {
    id: "hearings",
    icon: "",
    label: "Hearings",
    desc: "View and filter scheduled property hearings.",
  },
  {
    id: "clients/list-client",
    icon: "",
    label: "Clients",
    desc: "View, search for and add new Client.",
  },
  {
    id: "prospects/list-prospect",
    icon: "",
    label: "Prospects",
    desc: "View, search for and add new Prospect.",
  },
  {
    id: "contract",
    icon: "",
    label: "Contracts",
    desc: "Create and send client contract.",
  },
  {
    id: "agent",
    icon: "",
    label: "Appointment of Agent (AOA)",
    desc: "Create and send Appointment of Agent (Form 50-162).",
  },
];

const DashboardHeader = ({ onMenuToggle }: { onMenuToggle: () => void }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname.split("/portal/")[1];

  const username = localStorage.getItem("username") || "User";

  async function logoutHandler() {
    try {
      logoutUser();
      // Show success toast
      toast({
        title: "Logged Out!",
      });
      navigate("/login");
    } catch (error) {}
  }

  // If there's no path after /portal, treat it as the dashboard
  const isDashboard = !currentPath;

  const currentHeader = headerData.find((item) => item.id === currentPath);

  return (
    <div className="flex justify-between p-4">
      {/* Hamburger Menu Button (Small Screens) */}
      <button
        type="button"
        className="sm:hidden p-2 text-gray-700"
        onClick={onMenuToggle}
        aria-label="Toggle menu"
      >
        <Menu size={24} />
      </button>
      <div>
        {isDashboard ? (
          <HeaderDescriptionItem
            icon=""
            label={`Welcome, ${username}`}
            desc="This is your dashboard."
          />
        ) : currentHeader ? (
          <HeaderDescriptionItem
            icon={currentHeader.icon}
            label={currentHeader.label}
            desc={currentHeader.desc}
          />
        ) : (
          <div className="hidden md:block">
            <HeaderDescriptionItem
              icon={""}
              label={`Welcome, ${username}`}
              desc={""}
            />
          </div>
        )}
      </div>
      <div className="flex justify-center align-center items-center gap-4">
        <span className="sr-only">Notifications</span>
        <BellIcon size={20} aria-hidden />
        <div className="flex justify-center align-center items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger>
              <div className="text-sm flex gap-1 border p-1 rounded-lg">
                <User2 size={20} />
                <h1>{username}</h1>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="p-4 font-semibold">
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem onClick={logoutHandler}>
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};

const HeaderDescriptionItem = ({ icon, label, desc }: DashboardHeaderProps) => {
  return (
    <div className="">
      {icon && <img src={icon} alt="" aria-hidden />}
      <p className="font-extrabold text-xl">{label}</p>
      {desc ? (
        <p className="text-sm font-thin">{desc}</p>
      ) : (
        <div className="text-sm font-thin">
          <CurrentDate />
        </div>
      )}
    </div>
  );
};

export default DashboardHeader;
