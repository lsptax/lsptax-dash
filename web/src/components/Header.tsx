import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Menu, Phone, X } from "lucide-react";
import logo from "@/assets/logo.svg";
import { SITE_CONTACT, SITE_NAV } from "@/components/landing/content";
import { usePublicSiteFont } from "@/components/landing/hooks";

const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const closeMenu = () => setMenuOpen(false);
  usePublicSiteFont();

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [menuOpen]);

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-40 border-b border-site-line bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85"
    >
      <nav
        className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-3 sm:px-6 lg:px-8"
        aria-label="Main navigation"
      >
        <Link
          to="/"
          className="flex shrink-0 items-center gap-3"
          aria-label="Lone Star Property Tax home"
          onClick={closeMenu}
        >
          <img src={logo} alt="" className="h-11 w-auto" />
          <span className="hidden font-serif text-lg font-semibold leading-tight text-site-navy sm:block">
            Lone Star
            <span className="block font-sans text-xs font-semibold uppercase tracking-[0.18em] text-site-gold-ink">
              Property Tax
            </span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {SITE_NAV.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className="rounded-md px-3 py-2 text-sm font-semibold text-site-slate transition-colors hover:text-site-navy"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-4 lg:flex">
          <a
            href={SITE_CONTACT.phoneHref}
            className="inline-flex items-center gap-2 text-sm font-semibold text-site-navy"
          >
            <Phone className="h-4 w-4 text-site-gold-ink" aria-hidden />
            {SITE_CONTACT.phone}
          </a>
          <Link
            to="/#contact"
            className="inline-flex h-10 items-center rounded-full bg-site-navy px-5 text-sm font-semibold text-white transition-colors hover:bg-site-navy-2"
          >
            Get started
          </Link>
        </div>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md text-site-navy lg:hidden"
          aria-expanded={menuOpen}
          aria-controls="site-mobile-menu"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {menuOpen ? (
        <div id="site-mobile-menu" className="border-t border-site-line bg-white px-4 pb-5 pt-2 lg:hidden">
          <div className="flex flex-col">
            {SITE_NAV.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className="border-b border-site-line/70 py-3 text-base font-semibold text-site-ink"
                onClick={closeMenu}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-3">
            <Link
              to="/#contact"
              className="inline-flex h-11 items-center justify-center rounded-full bg-site-navy text-sm font-semibold text-white"
              onClick={closeMenu}
            >
              Get started
            </Link>
            <a
              href={SITE_CONTACT.phoneHref}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-site-line text-sm font-semibold text-site-navy"
              onClick={closeMenu}
            >
              <Phone className="h-4 w-4" aria-hidden />
              {SITE_CONTACT.phone}
            </a>
          </div>
        </div>
      ) : null}
    </header>
  );
};

export default Header;
