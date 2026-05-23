import { useState, Suspense } from "react";
import { Outlet } from "react-router-dom";
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

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-background to-brand-muted/30">
      <div className="flex h-full">
        <div
          className={`fixed z-40 top-0 left-0 h-full bg-white shadow transition-transform transform ${
            isMenuOpen ? "translate-x-0" : "-translate-x-full"
          } sm:relative sm:translate-x-0 sm:flex`}
        >
          <SideMenu />
        </div>
        <div className="flex-1 h-full overflow-hidden flex flex-col">
          <DashboardHeader onMenuToggle={() => setIsMenuOpen(!isMenuOpen)} />
          <main id="main" className="flex-1 overflow-auto" tabIndex={-1}>
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
          className="fixed inset-0 bg-black bg-opacity-50 z-30 sm:hidden"
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
