import { NavLink, useSearchParams } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { getSingleProspect } from "@/store/data";
import { Mail, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Property, Prospect } from "@/types/types";
import { routes } from "@/routes/ROUTES";
import { BackToListLink } from "../BackToListLink";
import { AssociatedPropertiesSection } from "../shared/AssociatedPropertiesSection";
import { ContractsAoasSection } from "../shared/ContractsAoasSection";
import { EntityDetailRow, EntityDetailsCard } from "../shared/EntityDetailRow";
import { SendEnvelopeDialog } from "../shared/SendEnvelopeDialog";
import { useEntityContracts } from "@/hooks/useEntityContracts";

interface ProspectData {
  prospect: Prospect;
  properties: Property[];
}

const statusColors: Record<string, string> = {
  NOT_CONTACTED: "bg-red-100 text-red-800 hover:bg-red-200",
  CONTACTED: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
  IN_PROGRESS: "bg-green-100 text-green-800 hover:bg-green-200",
  SIGNED: "bg-blue-100 text-blue-800 hover:bg-blue-200",
};

const ProspectPage = () => {
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const [prospectData, setProspectData] = useState<ProspectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const contractsState = useEntityContracts(prospectData?.prospect?.id);

  const fetchProspectData = useCallback(async () => {
    if (!id) {
      setProspectData(null);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await getSingleProspect({ prospectId: id });
      setProspectData(response ?? null);
    } catch (e) {
      console.error("Error fetching prospect:", e);
      setError("Failed to load prospect.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProspectData();
  }, [fetchProspectData]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") fetchProspectData();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [fetchProspectData]);

  if (loading) {
    return (
      <div className="text-center text-muted-foreground mt-10">
        Loading prospect data...
      </div>
    );
  }

  if (!id) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 min-h-[40vh] px-4 text-center mt-10">
        <p className="text-lg font-semibold text-red-600">Prospect ID is required</p>
        <p className="text-muted-foreground max-w-md">
          Open a prospect from the list so the URL includes{" "}
          <code className="text-sm bg-muted px-1 rounded">?id=…</code>.
        </p>
        <BackToListLink fallback={routes.prospects.list()} label="Back to prospects" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-destructive mt-10 font-semibold">
        {error}
      </div>
    );
  }

  if (!prospectData) {
    return (
      <div className="text-center text-muted-foreground mt-10">
        No prospect data available.
      </div>
    );
  }

  const { prospect, properties } = prospectData;
  const nonArchivedProperties = properties.filter(
    (p) => !(p.isArchived ?? p.IsArchived)
  );

  return (
    <div className="px-4 sm:px-6 py-4">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <BackToListLink fallback={routes.prospects.list()} label="Back to prospects" />
          <span
            className={`${
              statusColors[prospect.status] ?? "bg-muted text-foreground"
            } rounded-md border border-border px-2 py-0.5 text-xs font-medium`}
          >
            {prospect.status}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SendEnvelopeDialog
            kind="docs"
            entityId={prospect.id}
            entityLabel="prospect"
            entityName={prospect.clientName ?? ""}
            email={prospect.email}
            properties={nonArchivedProperties}
            contractPreviewTo={routes.prospect.contract(prospect.id)}
            aoaPreviewTo={(propertyId) => routes.prospect.aoa(propertyId)}
            onSent={contractsState.refresh}
          />
          <NavLink to={routes.editProspect(prospect.id)}>
            <Button variant="outline" size="sm">
              Edit Prospect Details
            </Button>
          </NavLink>
          <NavLink to={routes.prospect.contract(id)}>
            <Button variant="outline" size="sm">
              Create Contract
            </Button>
          </NavLink>
        </div>
      </div>

      <EntityDetailsCard>
        <EntityDetailRow label="Client Name:">{prospect.clientName}</EntityDetailRow>
        <EntityDetailRow label="Phone:">
          <Phone size={16} className="inline text-primary mr-2" />
          {prospect.phoneNumber}
        </EntityDetailRow>
        <EntityDetailRow label="Email:">
          <Mail size={16} className="inline text-primary mr-2" />
          {prospect.email}
        </EntityDetailRow>
        {prospect.billingEmail && prospect.billingEmail !== prospect.email && (
          <EntityDetailRow label="Secondary Email:">
            <Mail size={16} className="inline text-primary mr-2" />
            {prospect.billingEmail}
          </EntityDetailRow>
        )}
        <EntityDetailRow label="Billing Address:">
          <MapPin size={16} className="inline text-primary mr-2" />
          {prospect.billingAddress ??
            [prospect.mailingAddress, prospect.mailingAddressCityTxZip]
              .filter(Boolean)
              .join(", ")}
        </EntityDetailRow>
        {prospect.contingencyFee != null && prospect.contingencyFee !== "" && (
          <EntityDetailRow label="Contingency Fee:">
            {prospect.contingencyFee}%
          </EntityDetailRow>
        )}
      </EntityDetailsCard>

      <ContractsAoasSection
        entityId={prospect.id}
        entityLabel="prospect"
        entityName={prospect.clientName ?? ""}
        email={prospect.email}
        properties={nonArchivedProperties}
        contracts={contractsState.contracts}
        loading={contractsState.loading}
        downloadingId={contractsState.downloadingId}
        emptyMessage='No contracts or AOAs yet. Use "Create Contract" to preview and send.'
        onRefresh={contractsState.refresh}
        onDownloadSigned={contractsState.downloadSigned}
      />

      <div className="mt-8">
        <AssociatedPropertiesSection
          properties={properties}
          addHref={routes.prospect.addProperty(prospect.id)}
          propertyHref={(property) => routes.prospect.property(property.id)}
        />
      </div>
    </div>
  );
};

export default ProspectPage;
