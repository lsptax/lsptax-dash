import { NavLink, useSearchParams } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { getSingleClient } from "@/store/data";
import { Mail, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClientData, Property } from "@/types/types";
import { routes } from "@/routes/ROUTES";
import { BackToListLink } from "../BackToListLink";
import { ListDetailLink } from "../ListDetailLink";
import { formatClientNumberDisplay } from "@/utils/clientContact";
import { AssociatedPropertiesSection } from "../shared/AssociatedPropertiesSection";
import { ContractsAoasSection } from "../shared/ContractsAoasSection";
import { EntityDetailRow, EntityDetailsCard } from "../shared/EntityDetailRow";
import { SendEnvelopeDialog } from "../shared/SendEnvelopeDialog";
import { SendClientEmailDialog } from "./SendClientEmailDialog";
import { useEntityContracts } from "@/hooks/useEntityContracts";

interface Client {
  client: ClientData;
  properties: Property[];
}

const ClientPage = () => {
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get("clientId");
  const [clientData, setClientData] = useState<Client | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const contractsState = useEntityContracts(clientData?.client?.id);

  const fetchClientData = useCallback(async () => {
    if (!clientId) {
      setError("No client ID provided in the URL.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setClientData(null);

    try {
      const response = await getSingleClient({ clientId });

      if (!response || !response.client) {
        setError("No data found for the specified client ID.");
      } else {
        setClientData(response as Client);
        setError(null);
      }
    } catch (err) {
      console.error("Error fetching client data:", err);
      setError(
        "An error occurred while fetching client data. Please try again later."
      );
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void fetchClientData();
  }, [fetchClientData]);

  if (loading) {
    return (
      <div className="text-center text-muted-foreground mt-10">
        Loading client data...
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

  if (!clientData) {
    return (
      <div className="text-center text-muted-foreground mt-10">
        No client data available.
      </div>
    );
  }

  const { client, properties } = clientData;
  const nonArchivedProperties = properties.filter(
    (p) => !(p.isArchived ?? p.IsArchived)
  );

  return (
    <div className="px-4 sm:px-6 py-4">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <BackToListLink fallback={routes.clients.list()} label="Back to clients" />
        <div className="flex flex-wrap items-center gap-2">
          <SendClientEmailDialog clientId={client.id} clientName={client.clientName ?? ""} />
          <SendEnvelopeDialog
            kind="docs"
            entityId={client.id}
            entityLabel="client"
            entityName={client.clientName ?? ""}
            email={client.email}
            properties={nonArchivedProperties}
            contractPreviewTo={routes.client.contract(client.id)}
            aoaPreviewTo={(propertyId) => routes.properties.aoa(propertyId)}
            onSent={contractsState.refresh}
          />
          <NavLink to={routes.client.edit(client.id)}>
            <Button variant="outline" size="sm">
              Edit Client Details
            </Button>
          </NavLink>
          <ListDetailLink to={routes.invoices.byClient(client.id)}>
            <Button variant="outline" size="sm">
              Invoice
            </Button>
          </ListDetailLink>
          <NavLink to={routes.client.contract(client.id)}>
            <Button variant="outline" size="sm">
              Create Contract
            </Button>
          </NavLink>
        </div>
      </div>

      <EntityDetailsCard>
        <EntityDetailRow label="Client #:">
          {formatClientNumberDisplay(client.clientNumber, client.CLIENTNumber)}
        </EntityDetailRow>
        <EntityDetailRow label="Client Name:">{client.clientName}</EntityDetailRow>
        <EntityDetailRow label="Phone:">
          <Phone size={16} className="inline text-primary mr-2" />
          {client.phoneNumber}
        </EntityDetailRow>
        <EntityDetailRow label="Email:">
          <Mail size={16} className="inline text-primary mr-2" />
          {client.email}
        </EntityDetailRow>
        <EntityDetailRow label="Address:">
          <MapPin size={16} className="inline text-primary mr-2" />
          {client.mailingAddress}, {client.mailingAddressCityTxZip}
        </EntityDetailRow>
        {client.contingencyFee != null && client.contingencyFee !== "" && (
          <EntityDetailRow label="Contingency Fee:">
            {client.contingencyFee}%
          </EntityDetailRow>
        )}
      </EntityDetailsCard>

      <AssociatedPropertiesSection
        properties={properties}
        addHref={routes.client.addProperty(client.id)}
        propertyHref={(property) => routes.properties.view(property.id)}
      />

      <ContractsAoasSection
        entityId={client.id}
        entityLabel="client"
        entityName={client.clientName ?? ""}
        email={client.email}
        properties={nonArchivedProperties}
        contracts={contractsState.contracts}
        loading={contractsState.loading}
        downloadingId={contractsState.downloadingId}
        onRefresh={contractsState.refresh}
        onDownloadSigned={contractsState.downloadSigned}
      />
    </div>
  );
};

export default ClientPage;
