import { NavLink, useSearchParams } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { getSingleClient } from "@/store/data";
import {
  getContractsByClient,
  getContractDownloadUrl,
  sendDocs,
  sendAoaForAllProperties,
  syncClientContractStatus,
  type ContractListItem,
} from "@/api/api";
import { House, Mail, MapPin, Phone, FileText, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Checkbox } from "@/components/ui/checkbox";
import { ClientData, Property } from "@/types/types";
import { routes } from "@/routes/ROUTES";
import { useToast } from "@/hooks/use-toast";

interface Client {
  client: ClientData;
  properties: Property[];
}

const ClientPage = () => {
  const [searchParams] = useSearchParams();
  const clientId = searchParams.get("clientId");
  const { toast } = useToast();
  const [clientData, setClientData] = useState<Client | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCounty, setSelectedCounty] = useState<string>("All");
  const [contracts, setContracts] = useState<ContractListItem[]>([]);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [downloadingContractId, setDownloadingContractId] = useState<number | null>(null);
  const [sendAllOpen, setSendAllOpen] = useState(false);
  const [sendAllAgree, setSendAllAgree] = useState(false);
  const [sendAllSending, setSendAllSending] = useState(false);
  const [sendAllDocsOpen, setSendAllDocsOpen] = useState(false);
  const [sendAllDocsAgree, setSendAllDocsAgree] = useState(false);
  const [sendAllDocsSending, setSendAllDocsSending] = useState(false);

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

  const fetchContracts = useCallback(() => {
    const id = clientData?.client?.id;
    if (!id) return;
    setContractsLoading(true);
    syncClientContractStatus(id)
      .catch(() => {})
      .then(() => getContractsByClient(id))
      .then(setContracts)
      .catch(() => setContracts([]))
      .finally(() => setContractsLoading(false));
  }, [clientData?.client?.id]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  // Refetch contracts when user returns to this tab (e.g. after sending from contract page)
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") fetchContracts();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [fetchContracts]);

  const handleDownloadSigned = async (contractId: number) => {
    setDownloadingContractId(contractId);
    try {
      const { url } = await getContractDownloadUrl(contractId);
      window.open(url, "_blank");
    } catch {
      // Error could be shown via toast if you add useToast
    } finally {
      setDownloadingContractId(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center text-gray-500 mt-10">
        Loading client data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 mt-10 font-semibold">
        {error}
      </div>
    );
  }

  if (!clientData) {
    return (
      <div className="text-center text-gray-500 mt-10">
        No client data available.
      </div>
    );
  }

  const uniqueCounties = Array.from(
    new Set(clientData.properties.map((p) => p.cadCounty))
  );
  const filteredProperties = clientData.properties.filter((p) =>
    selectedCounty === "All" ? true : p.cadCounty === selectedCounty
  );
  const nonArchivedProperties = clientData.properties.filter(
    (p) => !(p.isArchived ?? p.IsArchived)
  );

  const handleSendAllAoas = async () => {
    const id = clientData.client.id;
    setSendAllSending(true);
    try {
      const res = await sendAoaForAllProperties(id);
      toast({
        title: res.success ? "✓ AOA envelope sent" : "AOA envelope sent (with failures)",
        description: `Sent ${res.sent}/${res.total}. Failed ${res.failed}.` + (res.envelopeId ? ` Envelope: ${res.envelopeId}` : ""),
        variant: res.failed > 0 ? "destructive" : undefined,
      });
      setSendAllOpen(false);
      setSendAllAgree(false);
      fetchContracts();
    } catch (err) {
      toast({
        title: "Failed to send AOAs",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSendAllSending(false);
    }
  };

  const handleSendAllDocs = async () => {
    const id = clientData.client.id;
    setSendAllDocsSending(true);
    try {
      const res = await sendDocs(id, "all_docs");
      toast({
        title: "✓ Docs sent",
        description: "Contract + all AOAs have been sent in a single envelope." + ("envelopeId" in res && res.envelopeId ? ` Envelope: ${res.envelopeId}` : ""),
      });
      setSendAllDocsOpen(false);
      setSendAllDocsAgree(false);
      fetchContracts();
    } catch (err) {
      toast({
        title: "Failed to send docs",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSendAllDocsSending(false);
    }
  };

  return (
    <div className="m-2 rounded-lg bg-white p-4">
      <div className="flex justify-between">
        <h1 className="text-4xl font-bold text-center mb-6">Client Details</h1>
        <div className="flex gap-4">
          <AlertDialog
            open={sendAllDocsOpen}
            onOpenChange={(open) => {
              setSendAllDocsOpen(open);
              if (!open) setSendAllDocsAgree(false);
            }}
          >
            <AlertDialogTrigger asChild>
              <Button
                variant={"blue"}
                className="w-full"
                disabled={nonArchivedProperties.length === 0}
                onClick={() => setSendAllDocsOpen(true)}
              >
                Send All Docs
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Send all docs (single envelope)</AlertDialogTitle>
                <AlertDialogDescription>
                  This will send <strong>one DocuSign email/envelope</strong> to the client with the{" "}
                  <strong>client contract</strong> and{" "}
                  <strong>one AOA PDF per non-archived property</strong>.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="space-y-3">
                <div className="rounded-md border bg-muted/30 p-3 text-sm">
                  <div className="font-medium mb-2">Summary</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <span className="text-muted-foreground">Client:</span>{" "}
                      {clientData.client.clientName}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Email:</span>{" "}
                      {clientData.client.email || "—"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Properties:</span>{" "}
                      {nonArchivedProperties.length}
                    </div>
                  </div>
                </div>

                <div className="rounded-md border">
                  <div className="px-3 py-2 text-sm font-medium bg-gray-50 border-b">
                    Docs to be sent
                  </div>
                  <div className="p-3 space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium">Client contract</div>
                        <div className="text-muted-foreground">Preview the generated contract PDF.</div>
                      </div>
                      <Button asChild size="sm" variant="outline" disabled={sendAllDocsSending}>
                        <NavLink to={routes.client.contract(clientData.client.id)} target="_blank" rel="noreferrer">
                          Preview
                        </NavLink>
                      </Button>
                    </div>

                    <div className="border-t pt-3">
                      <div className="font-medium mb-2">AOAs (one per property)</div>
                      <div className="max-h-56 overflow-auto rounded-md border">
                        <table className="w-full text-sm">
                          <thead className="sticky top-0 bg-white border-b">
                            <tr>
                              <th className="text-left p-2 font-medium">Account #</th>
                              <th className="text-left p-2 font-medium">County</th>
                              <th className="text-left p-2 font-medium">Name on CAD</th>
                              <th className="text-right p-2 font-medium">Preview</th>
                            </tr>
                          </thead>
                          <tbody>
                            {nonArchivedProperties.map((p) => (
                              <tr key={p.id} className="border-b last:border-b-0">
                                <td className="p-2">{p.accountNumber ?? "—"}</td>
                                <td className="p-2">{p.cadCounty ?? "—"}</td>
                                <td className="p-2">{p.nameOnCad ?? "—"}</td>
                                <td className="p-2 text-right">
                                  <Button asChild size="sm" variant="outline" disabled={sendAllDocsSending}>
                                    <NavLink to={routes.properties.aoa(p.id)} target="_blank" rel="noreferrer">
                                      Preview
                                    </NavLink>
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>

                <label className="flex items-start gap-2 text-sm">
                  <Checkbox
                    checked={sendAllDocsAgree}
                    onCheckedChange={(v) => setSendAllDocsAgree(v === true)}
                    disabled={sendAllDocsSending}
                    className="mt-0.5"
                  />
                  <span>
                    I understand this sends a single DocuSign envelope containing the contract and AOAs for all
                    listed properties.
                  </span>
                </label>
              </div>

              <AlertDialogFooter>
                <AlertDialogCancel disabled={sendAllDocsSending}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    if (!sendAllDocsAgree || sendAllDocsSending) return;
                    void handleSendAllDocs();
                  }}
                  className={!sendAllDocsAgree ? "opacity-50 pointer-events-none" : ""}
                >
                  {sendAllDocsSending ? (
                    <span className="inline-flex items-center gap-2">
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Sending…
                    </span>
                  ) : (
                    "Agree & send docs"
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <NavLink to={routes.client.edit(clientData.client.id)}>
            <Button variant={"blue"} className="w-full">
              Edit Client Details
            </Button>
          </NavLink>
          <NavLink to={routes.invoices.byClient(clientData.client.id)}>
            <Button variant={"blue"} className="w-full">
              Invoice
            </Button>
          </NavLink>
          <NavLink to={routes.client.contract(clientData.client.id)}>
            <Button variant={"blue"} className="w-full">
              Create Contract
            </Button>
          </NavLink>
        </div>
      </div>

      <div className="gap-2 flex flex-col md:flex-row justify-between">
        <div className="rounded-xl p-4 w-full">
          <table className="table-auto w-full">
            <tbody>
              <tr>
                <td className="font-medium">Client Name:</td>
                <td>{clientData.client.clientName}</td>
              </tr>
              <tr>
                <td className="font-medium">Phone:</td>
                <td>
                  <Phone size={18} className="inline text-indigo-600 mr-2" />
                  {clientData.client.phoneNumber}
                </td>
              </tr>
              <tr>
                <td className="font-medium">Email:</td>
                <td>
                  <Mail size={18} className="inline text-indigo-600 mr-2" />
                  {clientData.client.email}
                </td>
              </tr>
              <tr>
                <td className="font-medium">Address:</td>
                <td>
                  <MapPin size={18} className="inline text-indigo-600 mr-2" />
                  {clientData.client.mailingAddress},{" "}
                  {clientData.client.mailingAddressCityTxZip}
                </td>
              </tr>
              {(clientData.client.contingencyFee != null && clientData.client.contingencyFee !== "") && (
                <tr>
                  <td className="font-medium">Contingency Fee:</td>
                  <td>{clientData.client.contingencyFee}%</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Associated Property(s)</h1>
          <NavLink
            to={routes.client.addProperty(clientData.client.id)}
          >
            <Button variant={"blue"} className="w-full">
              Add Properties
            </Button>
          </NavLink>
        </div>

        {uniqueCounties.length > 1 && (
          <div className="mb-6">
            <label htmlFor="county-filter" className="mr-2 font-medium">
              Filter by County:
            </label>
            <select
              id="county-filter"
              value={selectedCounty}
              onChange={(e) => setSelectedCounty(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1 text-sm"
            >
              <option value="All">All</option>
              {uniqueCounties.map((county) => (
                <option key={county} value={county}>
                  {county}
                </option>
              ))}
            </select>
          </div>
        )}

        {filteredProperties.length ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProperties.map((property) => (
              <PropertyBox key={property.id} {...property} />
            ))}
          </div>
        ) : (
          <h1 className="text-center text-gray-600 col-span-full">
            No properties found for the selected county.
          </h1>
        )}
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Contracts & AOAs</h2>
          <div className="flex items-center gap-2">
            <AlertDialog open={sendAllOpen} onOpenChange={(open) => {
              setSendAllOpen(open);
              if (!open) setSendAllAgree(false);
            }}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="blue"
                  size="sm"
                  disabled={nonArchivedProperties.length === 0}
                  onClick={() => setSendAllOpen(true)}
                >
                  Send AOA for all properties
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>Send AOA for all properties (single envelope)</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will send <strong>one DocuSign email/envelope</strong> to the client with <strong>one AOA PDF per non-archived property</strong>.
                    If any property is not eligible (e.g. already sent), it may be skipped and reported as failed.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="space-y-3">
                  <div className="rounded-md border bg-muted/30 p-3 text-sm">
                    <div className="font-medium mb-2">Summary</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div><span className="text-muted-foreground">Client:</span> {clientData.client.clientName}</div>
                      <div><span className="text-muted-foreground">Email:</span> {clientData.client.email || "—"}</div>
                      <div><span className="text-muted-foreground">Properties:</span> {nonArchivedProperties.length}</div>
                    </div>
                  </div>

                  <div className="rounded-md border">
                    <div className="px-3 py-2 text-sm font-medium bg-gray-50 border-b">
                      Properties to include
                    </div>
                    <div className="max-h-56 overflow-auto">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-white border-b">
                          <tr>
                            <th className="text-left p-2 font-medium">Account #</th>
                            <th className="text-left p-2 font-medium">County</th>
                            <th className="text-left p-2 font-medium">Name on CAD</th>
                          </tr>
                        </thead>
                        <tbody>
                          {nonArchivedProperties.map((p) => (
                            <tr key={p.id} className="border-b last:border-b-0">
                              <td className="p-2">{p.accountNumber ?? "—"}</td>
                              <td className="p-2">{p.cadCounty ?? "—"}</td>
                              <td className="p-2">{p.nameOnCad ?? "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <label className="flex items-start gap-2 text-sm">
                    <Checkbox
                      checked={sendAllAgree}
                      onCheckedChange={(v) => setSendAllAgree(v === true)}
                      disabled={sendAllSending}
                      className="mt-0.5"
                    />
                    <span>
                      I understand this sends a single DocuSign envelope and the client will receive an email to sign AOAs for all listed properties.
                    </span>
                  </label>
                </div>

                <AlertDialogFooter>
                  <AlertDialogCancel disabled={sendAllSending}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault();
                      if (!sendAllAgree || sendAllSending) return;
                      void handleSendAllAoas();
                    }}
                    className={!sendAllAgree ? "opacity-50 pointer-events-none" : ""}
                  >
                    {sendAllSending ? (
                      <span className="inline-flex items-center gap-2">
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Sending…
                      </span>
                    ) : (
                      "Agree & send AOAs"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button
              variant="outline"
              size="sm"
              disabled={contractsLoading}
              onClick={() => fetchContracts()}
            >
              {contractsLoading ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                "Refresh status"
              )}
            </Button>
          </div>
        </div>
        {contractsLoading ? (
          <div className="flex items-center gap-2 text-gray-600 py-4">
            <LoaderCircle className="h-5 w-5 animate-spin" />
            Loading contracts...
          </div>
        ) : contracts.length === 0 ? (
          <p className="text-gray-600">No contracts or AOAs yet.</p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left p-3 font-medium">Type</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Property</th>
                  <th className="text-left p-3 font-medium">Signed at</th>
                  <th className="text-left p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="p-3">
                      {c.type === "AOA" ? "AOA" : "Client contract"}
                    </td>
                    <td className="p-3">
                      <Badge
                        variant={
                          c.status === "COMPLETED"
                            ? "default"
                            : c.status === "DECLINED" || c.status === "VOIDED"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {c.status}
                      </Badge>
                    </td>
                    <td className="p-3">
                      {c.property?.accountNumber ?? "—"}
                    </td>
                    <td className="p-3">
                      {c.signedAt
                        ? new Date(c.signedAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="p-3">
                      {c.status === "COMPLETED" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={downloadingContractId === c.id}
                          onClick={() => handleDownloadSigned(c.id)}
                        >
                          {downloadingContractId === c.id ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                          ) : (
                            <FileText className="h-4 w-4 mr-1" />
                          )}
                          Download signed
                        </Button>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientPage;

const PropertyBox: React.FC<Property> = ({
  id,
  accountNumber,
  nameOnCad,
  cadCounty,
}) => {
  return (
    <NavLink to={routes.properties.view(id)} className="block">
      <div className="border rounded-2xl p-4 shadow-md hover:shadow-lg transition duration-300 bg-gradient-to-tr from-white to-gray-50 hover:from-blue-50 cursor-pointer h-full flex flex-col justify-between">
        <div className="flex items-center gap-3 mb-4">
          <House size={24} className="text-indigo-500" />
          <h2 className="text-lg font-semibold text-gray-800">
            {accountNumber}
          </h2>
        </div>
        <div className="text-sm text-gray-600 mb-2">
          <span className="font-medium text-gray-700">County:</span> {cadCounty}
        </div>
        <div className="text-sm text-gray-600">
          <span className="font-medium text-gray-700">CAD Details:</span>{" "}
          {nameOnCad}
        </div>
      </div>
    </NavLink>
  );
};
