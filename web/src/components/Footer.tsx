import { Link } from "react-router-dom";
import logo from "@/assets/logo.svg";
import { SITE_NAV } from "@/components/landing/content";
import { ContactLinks } from "@/components/landing/ContactLinks";

const Footer = () => {
  return (
    <footer className="bg-site-navy text-white/80">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-white p-1.5">
              <img src={logo} alt="" className="h-10 w-auto" />
            </span>
            <span className="font-serif text-xl font-semibold text-white">Lone Star Property Tax</span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed">
            Property tax consulting and protest representation for residential, commercial and
            business property owners across Texas.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-site-gold">Explore</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {SITE_NAV.map((item) => (
              <li key={item.href}>
                <Link to={item.href} className="transition-colors hover:text-white">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-site-gold">Contact</h2>
          <ContactLinks
            className="mt-4 space-y-3 text-sm"
            linkClassName="transition-colors hover:text-white"
            addressLabel="Mailing address"
          />
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} Lone Star Property Tax. All rights reserved.</p>
          <div className="flex gap-5">
            <Link to="/privacy" className="transition-colors hover:text-white">
              Privacy Policy
            </Link>
            <Link to="/terms" className="transition-colors hover:text-white">
              Terms of Use
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
