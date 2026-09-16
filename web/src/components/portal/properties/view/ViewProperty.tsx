import { useCallback, useEffect, useState } from "react";
import { NavLink, useNavigate, useSearchParams } from "react-router-dom";
import { getSingleProperty, generateInvoices } from "@/store/data";
import { LoaderCircle, Mail, MapPin, Phone, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PropertyData } from "@/types/types";
import { deleteProperty } from "@/api/api";
import YearTable from "../yeardata/YearTable";
import { PROPERTY_INVOICE_YEARS } from "../propertyInvoiceYears";
import { PropertyLifecyclePanel } from "@/components/portal/properties/lifecycle/PropertyLifecyclePanel";
import { useToast } from "@/hooks/use-toast";
import { routes, resolveReturnTo } from "@/routes/ROUTES";
import { BackToListLink } from "../../BackToListLink";
import { ListDetailLink } from "../../ListDetailLink";
import { formatClientNumberDisplay } from "@/utils/clientContact";
import { EntityDetailRow } from "../../shared/EntityDetailRow";

function clampToPropertyInvoiceYear(year: number): number {
  const min = Math.min(...PROPERTY_INVOICE_YEARS);
  const max = Math.max(...PROPERTY_INVOICE_YEARS);
  return Math.min(max, Math.max(min, year));
}

const ViewProperty = () => {
  const { toast } = useToast();
  const [property, setProperty] = useState<PropertyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false); // Track deletion state
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false); // Track invoice generation state
  const [selectedYear, setSelectedYear] = useState(() =>
    clampToPropertyInvoiceYear(new Date().getFullYear())
  ); // Track selected year (restricted to property invoice years)
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const propertyIdParam = searchParams.get("propertyId");
  const parsedPropertyId =
    propertyIdParam != null && propertyIdParam.trim() !== ""
      ? Number.parseInt(propertyIdParam, 10)
      : NaN;
  const propertyId =
    Number.isFinite(parsedPropertyId) && parsedPropertyId > 0
      ? parsedPropertyId
      : null;

  /** Refetch after lifecycle updates without full-page loading spinner. */
  const refreshPropertySnapshot = useCallback(async () => {
    if (propertyId == null) return;
    const propertyData = await getSingleProperty({
      propertyId: propertyId.toString(),
    });
    if (propertyData) setProperty(propertyData as PropertyData);
  }, [propertyId]);

  const fetchProperty = async (id: number) => {
    setLoading(true);
    setError("");
    setProperty(null);

    try {
      const propertyData = await getSingleProperty({
        propertyId: id.toString(),
      });

      if (!propertyData) {
        return;
      }

      setProperty(propertyData as PropertyData);
    } catch (err) {
      console.error("Error fetching property:", err);
      setError("Failed to fetch property details");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (propertyId == null) return;

    setIsDeleting(true);
    try {
      await deleteProperty(propertyId.toString());

      toast({
        title: "Property deleted",
        description: "The property has been removed from the system.",
      });

      setDeleteOpen(false);

      const clientId = property?.client?.id;
      const nextPath = resolveReturnTo(
        searchParams.get("returnTo"),
        clientId != null
          ? routes.client.detail(clientId)
          : routes.properties.list()
      );
      navigate(nextPath, { replace: true });
    } catch (error) {
      console.error("Error deleting property:", error);
      if (error instanceof Error) {
        toast({
          title: "Error deleting property",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleGenerateInvoice = async () => {
    if (!property) {
      toast({
        title: "Error",
        description: "Property data not available",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingInvoice(true);
    try {
      const clientId = property.client?.id;
      const accountNumber = property.propertyDetails.accountNumber;
      
      if (!clientId || !accountNumber) {
        toast({
          title: "Error",
          description: "Missing client ID or account number",
          variant: "destructive",
        });
        return;
      }

      const result = await generateInvoices({
        clientIds: [clientId],
        propertyAccountNumbers: [accountNumber],
        years: [selectedYear], // Use selected year
      });

      const totalProcessed = result.data.createdInvoices + result.data.updatedInvoices;
      const description = result.data.updatedInvoices > 0 
        ? `Processed ${totalProcessed} invoice(s) for ${selectedYear} (${result.data.createdInvoices} created, ${result.data.updatedInvoices} updated)`
        : `Generated ${result.data.createdInvoices} invoice(s) for ${selectedYear}`;

      toast({
        title: "✓ Invoice processed successfully",
        description,
      });

      // Refresh the property data to show the new invoice
      if (propertyId != null) {
        await fetchProperty(propertyId);
      }
      
    } catch (error) {
      console.error("Error generating invoice:", error);
      toast({
        title: "Error generating invoice",
        description: error instanceof Error ? error.message : "Failed to generate invoice",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  useEffect(() => {
    if (propertyId == null) {
      setLoading(false);
      setError("Property ID is required. Open this page from a property link with ?propertyId=…");
      setProperty(null);
      return;
    }
    fetchProperty(propertyId);
  }, [propertyId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg font-semibold text-gray-700">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 min-h-[40vh] px-4 text-center">
        <p className="text-lg font-semibold text-red-600">{error}</p>
        <BackToListLink fallback={routes.properties.list()} label="Back to properties" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 min-h-[40vh] px-4 text-center">
        <p className="text-lg font-semibold">Property not found</p>
        <p className="text-muted-foreground max-w-md">
          This property may have been deleted, or the link is no longer valid.
        </p>
        <BackToListLink fallback={routes.properties.list()} label="Back to properties" />
      </div>
    );
  }

  const activePropertyId = property.propertyDetails.id;

  const client = property.client;
  const prop = property.propertyDetails;
  const clientName = client?.clientName ?? "";
  const clientPhone = client?.phoneNumber ?? "";
  const clientEmail = client?.email ?? "";
  const clientNumber = client?.clientNumber ?? prop?.clientNumber ?? "";
  const accountNumber = prop?.accountNumber ?? "";
  const nameOnCad = prop?.nameOnCad ?? "";
  const mailingAddress = prop?.mailingAddress ?? "";
  const mailingCityZip = prop?.mailingAddressCityTxZip ?? "";
  const propertyAddress = prop?.propertyAddress ?? "";
  const cadCounty = prop?.cadCounty ?? "";
  const cadMailingDisplay =
    prop?.cadMailingAddressDisplay?.full ||
    [prop?.cadMailingAddressDisplay?.line1, prop?.cadMailingAddressDisplay?.line2]
      .filter(Boolean)
      .join(", ") ||
    [mailingAddress, mailingCityZip].filter(Boolean).join(", ");
  const acctType = String(client?.typeOfAcct ?? client?.TypeOfAcct ?? "")
    .trim()
    .toLowerCase();
  const showBpp = acctType === "bpp";

  return (
    <div className="w-full p-4 bg-card border rounded-lg">
      <div className="mb-4">
        <BackToListLink fallback={routes.properties.list()} label="Back to properties" />
      </div>
      <div className="flex flex-col md:flex-row justify-between ">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">View Property</h1>
        <div className="flex gap-4 flex-col md:flex-row w-full md:w-auto">
          <NavLink to={routes.properties.edit(property.propertyDetails.id)}>
            <Button className="w-full">Edit Property</Button>
          </NavLink>

          <ListDetailLink
            to={routes.invoices.byProperty(activePropertyId)}
          >
            <Button className="w-full">View Invoices</Button>
          </ListDetailLink>

          <NavLink to={routes.properties.aoa(property.propertyDetails.id)}>
            <Button className="w-full" variant="outline">
              Create AOA
            </Button>
          </NavLink>

          <div className="flex gap-2 w-full">
            <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Year" />
              </SelectTrigger>
              <SelectContent>
                {PROPERTY_INVOICE_YEARS.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={handleGenerateInvoice}
              disabled={isGeneratingInvoice}
              className="flex items-center gap-2"
              variant="outline"
            >
              {isGeneratingInvoice ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              {isGeneratingInvoice ? "Processing..." : "Generate/Update Invoice"}
            </Button>
          </div>

          {/* <NavLink to={"/editProperty"}>
            <Button className="w-full">Schedule Hearing Date</Button>
          </NavLink> */}
          <AlertDialog
            open={deleteOpen}
            onOpenChange={(open) => {
              if (isDeleting) return;
              setDeleteOpen(open);
            }}
          >
            <AlertDialogTrigger asChild>
              <Button
                disabled={isDeleting}
                className={`w-full ${
                  isDeleting
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {isDeleting ? "Deleting..." : "Delete Property"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this property?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently deletes property
                  {accountNumber ? ` #${accountNumber}` : ""}
                  {clientName ? ` for ${clientName}` : ""}. Invoices and related
                  records for this property will be removed. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700"
                  disabled={isDeleting}
                  onClick={(event) => {
                    event.preventDefault();
                    void handleDelete();
                  }}
                >
                  {isDeleting ? "Deleting..." : "Delete property"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 border rounded-xl bg-gray-100 my-2 p-4 text-lg">
        <div className="flex gap-2">
          <span>Client No:</span>
          <span className="font-bold">{formatClientNumberDisplay(clientNumber)}</span>
        </div>
        <div className="flex gap-2">
          <span>Property No:</span>
          <span className="font-bold">#{accountNumber || "—"}</span>
        </div>
      </div>

      <div className="gap-2 flex flex-col md:flex-row justify-between ">
        <div className="border rounded-xl p-4 w-full">
          <h2 className="font-semibold text-lg mb-2">Client Details</h2>
          <table className="table-auto w-full">
            <tbody>
              <EntityDetailRow label="Client:">{clientName || "—"}</EntityDetailRow>
              <EntityDetailRow label="Phone:">
                <Phone size={16} className="inline text-primary mr-2" />
                {clientPhone || "—"}
              </EntityDetailRow>
              <EntityDetailRow label="Email:">
                <Mail size={16} className="inline text-primary mr-2" />
                {clientEmail || "—"}
              </EntityDetailRow>
              <EntityDetailRow label="Address:">
                <MapPin size={16} className="inline text-primary mr-2" />
                {[mailingAddress, mailingCityZip].filter(Boolean).join(", ") || "—"}
              </EntityDetailRow>
            </tbody>
          </table>
        </div>

        <div className="border rounded-xl p-4 w-full">
          <h2 className="font-semibold text-lg mb-2">Property Details</h2>
          <table className="table-auto w-full">
            <tbody>
              <EntityDetailRow label="Name on CAD:">{nameOnCad || "—"}</EntityDetailRow>
              <EntityDetailRow label="Property Address:">
                {propertyAddress || "—"}
              </EntityDetailRow>
              <EntityDetailRow label="CAD Mailing Address:">
                {cadMailingDisplay || "—"}
              </EntityDetailRow>
              <EntityDetailRow label="County:">{cadCounty || "—"}</EntityDetailRow>
            </tbody>
          </table>
        </div>
      </div>

      <PropertyLifecyclePanel
        propertyId={activePropertyId}
        lifecycle={property.lifecycle}
        hearings={property.hearings ?? []}
        onUpdated={() => void refreshPropertySnapshot()}
      />

      <h2 className="text-xl font-semibold bg-muted p-4 rounded-lg my-2">
        Invoice Details
      </h2>
      <div className="mt-4">
        <YearTable invoices={property.invoices} showBpp={showBpp} />
      </div>
    </div>
  );
};

export default ViewProperty;