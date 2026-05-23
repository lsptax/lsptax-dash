import { lazy } from "react";
import { Navigate, Route } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";

import { propertiesColumn } from "@/components/portal/properties/columns";
import { invoicesColumn } from "@/components/portal/invoices/columns";
import { clientsColumn } from "@/components/portal/clients/list/columns";
import NotFoundPage from "@/page/NotFoundPage";
import { FeatureErrorBoundary } from "@/components/FeatureErrorBoundary";
import { ClientSectionLayout, ProspectSectionLayout } from "@/routes/layouts/PortalSectionLayouts";
import { routes } from "@/routes/ROUTES";

const Dashboard = lazy(() => import("@/components/portal/Dashboard"));
const PropertiesTable = lazy(() => import("@/components/portal/properties/PropertiesTable"));
const PropertyForm = lazy(() => import("@/components/portal/properties/add/PropertyForm"));
const ViewProperty = lazy(() => import("@/components/portal/properties/view/ViewProperty"));
const EditProperty = lazy(() => import("@/components/portal/properties/edit/EditProperty"));
const InvoicesTable = lazy(() => import("@/components/portal/invoices/InvoicesTable"));
const ClientTable = lazy(() => import("@/components/portal/clients/list/ClientTable"));
const AddClient = lazy(() => import("@/components/portal/clients/add/AddClient"));
const ClientPage = lazy(() => import("@/components/portal/clients/ClientPage"));
const EditClient = lazy(() => import("@/components/portal/clients/edit/EditClient"));
const AddProspect = lazy(() => import("@/components/portal/prospects/add/AddProspects"));
const ProspectTable = lazy(() => import("@/components/portal/prospects/list/ProspectsTable"));
const InvoicePage = lazy(() => import("@/components/portal/clients/invoice/InvoicePage"));
const MoveFromProspect = lazy(() => import("@/components/portal/clients/add/MoveFromProspect"));
const ContractForm = lazy(() => import("@/components/portal/clients/contract/ContractForm"));
const AppointmentForm = lazy(() => import("@/components/portal/properties/aoa/AppointmentForm"));
const PropertyAoaPage = lazy(() => import("@/components/portal/properties/aoa/PropertyAoaPage"));
const ProspectPage = lazy(() => import("@/components/portal/prospects/ProspectPage"));
const ProspectContractPage = lazy(() => import("@/components/portal/prospects/contract/ProspectContractPage"));
const ProspectAoaPage = lazy(() => import("@/components/portal/prospects/aoa/ProspectAoaPage"));
const AddProspectPropertyForm = lazy(() => import("@/components/portal/prospects/AddProspectProperty"));
const ProspectPropertyTable = lazy(() => import("@/components/portal/prospects/ProspectPropertyTable"));
const EditProspectProperty = lazy(() => import("@/components/portal/prospects/EditProspectProperty"));
const EditProspectDetails = lazy(() => import("@/components/portal/prospects/edit/EditProspectDetails"));
const PreviewSignedPdf = lazy(() => import("@/components/portal/prospects/preview/PreviewSignedPDF"));
const CsvUploadsPage = lazy(() => import("@/components/portal/csv/CsvUploadsPage"));
const ReportsPage = lazy(() => import("@/components/portal/reports/ReportsPage"));
const HearingsTable = lazy(() => import("@/components/portal/hearings/HearingsTable"));

/**
 * Child `<Route>` elements for `/portal/*`. Parent layout supplies `<Outlet />` + Suspense.
 */
export function PortalRouteElements() {
  return (
    <>
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<Dashboard />} />
      <Route
        path="properties"
        element={
          <FeatureErrorBoundary label="Properties list">
            <PropertiesTable columns={propertiesColumn} />
          </FeatureErrorBoundary>
        }
      />
      <Route path="add-property" element={<PropertyForm />} />
      <Route path="property" element={<ViewProperty />} />
      <Route path="edit-properties" element={<EditProperty />} />
      <Route
        path="invoices"
        element={
          <FeatureErrorBoundary label="Invoices list">
            <InvoicesTable columns={invoicesColumn as ColumnDef<unknown, unknown>[]} />
          </FeatureErrorBoundary>
        }
      />
      <Route
        path="hearings"
        element={
          <FeatureErrorBoundary label="Hearings list">
            <HearingsTable />
          </FeatureErrorBoundary>
        }
      />

      <Route path="clients" element={<ClientSectionLayout />}>
        <Route
          path="list-client"
          element={
            <FeatureErrorBoundary label="Clients list">
              <ClientTable columns={clientsColumn as ColumnDef<unknown, unknown>[]} />
            </FeatureErrorBoundary>
          }
        />
        <Route path="add-client" element={<AddClient />} />
        <Route path="move-from-prospect" element={<MoveFromProspect />} />
      </Route>

      <Route
        path="move_to_client"
        element={<Navigate to={routes.clients.moveFromProspect()} replace />}
      />

      <Route path="client" element={<ClientPage />} />
      <Route path="edit-client" element={<EditClient />} />
      <Route path="prospects/add-prospect" element={<AddProspect />} />
      <Route path="edit-prospect" element={<EditProspectDetails />} />
      <Route path="edit-prospect-properties" element={<EditProspectProperty />} />
      <Route
        path="prospects/list-prospect"
        element={
          <FeatureErrorBoundary label="Prospects list">
            <ProspectTable />
          </FeatureErrorBoundary>
        }
      />

      <Route path="prospect" element={<ProspectSectionLayout />}>
        <Route index element={<ProspectPage />} />
        <Route path="contract" element={<ProspectContractPage />} />
        <Route path="preview-docs" element={<PreviewSignedPdf />} />
        <Route path="add-prospect" element={<AddProspect />} />
        <Route path="add-property" element={<AddProspectPropertyForm />} />
        <Route path="property" element={<ProspectPropertyTable />} />
        <Route path="aoa" element={<ProspectAoaPage />} />
      </Route>

      <Route path="contract" element={<ContractForm />} />
      <Route path="aoa" element={<PropertyAoaPage />} />
      <Route path="agent" element={<AppointmentForm />} />
      <Route path="invoice" element={<InvoicePage />} />
      <Route path="csv-uploads" element={<CsvUploadsPage />} />
      <Route path="reports" element={<ReportsPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </>
  );
}

/** Suspense fallback for lazy portal pages (used around `<Outlet />`). */
export function PortalSuspenseFallback() {
  return (
    <div className="flex items-center justify-center min-h-[200px] text-muted-foreground">
      Loading...
    </div>
  );
}
