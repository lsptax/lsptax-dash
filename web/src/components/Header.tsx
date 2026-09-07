import logo from "@/assets/logo.svg";
import phoneLogo from "@/assets/icons/phone.svg";
import { ThemeToggle } from "@/components/ThemeToggle";

const navLinkClass =
  "px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground";

const Header = () => {
  return (
    <div className="scroll-smooth bg-background text-foreground border-b border-border">
      <div className="flex md:hidden justify-between items-center px-4 py-3 gap-2">
        <img src={logo} alt="Lone Star Property Tax logo" className="h-10 w-auto" />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <a
            href="#contact"
            className="bg-brand-accent text-white text-sm font-medium h-9 px-4 rounded-full inline-flex items-center gap-2"
          >
            <img src={phoneLogo} alt="" className="h-4 w-4" aria-hidden />
            Contact
          </a>
        </div>
      </div>
      <nav
        className="hidden md:flex items-center justify-between gap-6 px-8 py-3 max-w-7xl mx-auto"
        aria-label="Main navigation"
      >
        <img src={logo} alt="Lone Star Property Tax logo" className="h-11 w-auto" />
        <div className="flex items-center gap-1">
          <a href="#about" className={navLinkClass}>
            About us
          </a>
          <a href="#how" className={navLinkClass}>
            How it works
          </a>
          <a href="#keydates" className={navLinkClass}>
            Key dates
          </a>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <a
            href="#contact"
            className="bg-brand-accent text-white text-sm font-medium h-10 px-5 rounded-full inline-flex items-center gap-2"
          >
            <img src={phoneLogo} alt="" className="h-4 w-4" aria-hidden />
            Contact us
          </a>
        </div>
      </nav>
    </div>
  );
};

export default Header;
