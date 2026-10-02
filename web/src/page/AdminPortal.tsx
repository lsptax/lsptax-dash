import { useEffect, useState, Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import SideMenu from "@/components/portal/SideMenu";
import DashboardHeader from "@/components/portal/DashboardHeader";
import { Breadcrumbs } from "@/components/portal/Breadcrumbs";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { PortalSuspenseFallback } from "@/routes/portalRouteElements";

const AdminPortalErrorFallback = () => (
  <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
    <h1 className="text-xl font-semibold text-foreground">
      Portal couldn&apos;t load this view
    </h1>
    <p className="max-w-md text-muted-foreground text-sm">
      Try again, or reload the page if the problem persists.
    </p>
    <Button type="button" variant="outline" onClick={() => window.location.reload()}>
      Reload page
    </Button>
  </div>
);

const AdminPortal = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const previous = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
    };
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = previous.htmlOverflow;
      body.style.overflow = previous.bodyOverflow;
    };
  }, []);

  return (
    <div data-smooth-scroll="portal" className="fixed inset-0 flex overflow-hidden bg-background">
      <div className="flex h-full min-h-0 w-full">
        <div
          className={`fixed inset-y-0 left-0 z-40 h-full shrink-0 bg-card transition-transform ${
            isMenuOpen ? "translate-x-0" : "-translate-x-full"
          } sm:static sm:z-auto sm:translate-x-0`}
        >
          <SideMenu />
        </div>
        <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <DashboardHeader onMenuToggle={() => setIsMenuOpen(!isMenuOpen)} />
          <main id="main" className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain scroll-smooth" tabIndex={-1}>
            <Breadcrumbs />
            <ErrorBoundary fallback={<AdminPortalErrorFallback />}>
              <Suspense fallback={<PortalSuspenseFallback />}>
                <Outlet />
              </Suspense>
            </ErrorBoundary>
          </main>
        </div>
      </div>
      {isMenuOpen && (
        <div
          role="button"
          tabIndex={0}
          className="fixed inset-0 bg-black/50 z-30 sm:hidden"
          onClick={() => setIsMenuOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setIsMenuOpen(false);
            }
          }}
          aria-label="Close menu"
        />
      )}
    </div>
  );
};

export default AdminPortal;
