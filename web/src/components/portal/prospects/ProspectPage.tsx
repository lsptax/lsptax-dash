import { Link, NavLink, useSearchParams } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { getSingleProspect } from "@/store/data";
import {
  getContractsByClient,
  getContractDownloadUrl,
  sendDocs,
  sendAoaForAllProperties,
  syncClientContractStatus,
  type ContractListItem,
} from "@/api/api";
import { House, LoaderCircle, Mail, MapPin, Phone, FileText } from "lucide-react";

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
import { Property, Prospect } from "@/types/types";
import { useToast } from "@/hooks/use-toast";
import { routes } from "@/routes/ROUTES";

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
  const [selectedCounty, setSelectedCounty] = useState<string>("All");
  const [contracts, setContracts] = useState<ContractListItem[]>([]);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [downloadingContractId, setDownloadingContractId] = useState<number | null>(null);
  const { toast } = useToast();
  const [sendAllOpen, setSendAllOpen] = useState(false);
  const [sendAllAgree, setSendAllAgree] = useState(false);
  const [sendAllSending, setSendAllSending] = useState(false);
  const [sendAllDocsOpen, setSendAllDocsOpen] = useState(false);
  const [sendAllDocsAgree, setSendAllDocsAgree] = useState(false);
  const [sendAllDocsSending, setSendAllDocsSending] = useState(false);

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

  const fetchContracts = useCallback(() => {
    const prospectId = prospectData?.prospect?.id;
    if (!prospectId) return;
    setContractsLoading(true);
    syncClientContractStatus(prospectId)
      .catch(() => {})
      .then(() => getContractsByClient(prospectId))
      .then(setContracts)
      .catch(() => setContracts([]))
      .finally(() => setContractsLoading(false));
  }, [prospectData?.prospect?.id]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

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
      toast({
        title: "Download started",
        description: "Signed document opened in a new tab.",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Download failed",
        description: "Could not download signed PDF.",
      });
    } finally {
      setDownloadingContractId(null);
    }
  };

  if (loading) {
    return (
      <div className="text-center text-gray-500 mt-10">
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
        <Button asChild variant="outline">
          <Link to={routes.prospects.list()}>Back to prospects</Link>
        </Button>
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

  if (!prospectData) {
    return (
      <div className="text-center text-gray-500 mt-10">
        No prospect data available.
      </div>
    );
  }

  const { prospect, properties } = prospectData;

  const uniqueCounties = Array.from(
    new Set(properties.map((p) => p.cadCounty ?? p.CADCOUNTY).filter(Boolean))
  ) as string[];
  const filteredProperties = properties.filter((p) => {
    const county = p.cadCounty ?? p.CADCOUNTY;
    return selectedCounty === "All" ? true : county === selectedCounty;
  });
  const nonArchivedProperties = properties.filter(
    (p) => !(p.isArchived ?? p.IsArchived)
  );

  const handleSendAllAoas = async () => {
    const prospectId = prospect.id;
    setSendAllSending(true);
    try {
      const res = await sendAoaForAllProperties(prospectId);
      toast({
        title: res.success ? "✓ AOA envelope sent" : "AOA envelope sent (with failures)",
        description:
          `Sent ${res.sent}/${res.total}. Failed ${res.failed}.` +
          (res.envelopeId ? ` Envelope: ${res.envelopeId}` : ""),
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
    const prospectId = prospect.id;
    setSendAllDocsSending(true);
    try {
      const res = await sendDocs(prospectId, "all_docs");
      toast({
        title: "✓ Docs sent",
        description:
          "Contract + all AOAs have been sent in a single envelope." +
          ("envelopeId" in res && res.envelopeId ? ` Envelope: ${res.envelopeId}` : ""),
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
        <div className="flex justify-center items-center gap-4 mb-6">
          <h1 className="text-4xl font-bold text-center">Prospect Details</h1>
          <span
            className={`${
              statusColors[prospect.status] ?? "bg-gray-100 text-gray-800 hover:bg-gray-200"
            } border rounded-lg px-2 py-1 text-sm font-medium`}
          >
            {prospect.status}
          </span>
        </div>
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
                variant="blue"
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
                  This will send <strong>one DocuSign email/envelope</strong> to the prospect with the{" "}
                  <strong>client contract</strong> and{" "}
                  <strong>one AOA PDF per non-archived property</strong>.
                </AlertDialogDescription>
              </AlertDialogHeader>

              <div className="space-y-3">
                <div className="rounded-md border bg-muted/30 p-3 text-sm">
                  <div className="font-medium mb-2">Summary</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <span className="text-muted-foreground">Prospect:</span> {prospect.clientName}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Email:</span> {prospect.email || "—"}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Properties:</span> {nonArchivedProperties.length}
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
                        <NavLink to={routes.prospect.contract(prospect.id)} target="_blank" rel="noreferrer">
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
                                <td className="p-2">{p.accountNumber ?? p.AccountNumber ?? "—"}</td>
                                <td className="p-2">{p.cadCounty ?? p.CADCOUNTY ?? "—"}</td>
                                <td className="p-2">{p.nameOnCad ?? p.NAMEONCAD ?? "—"}</td>
                                <td className="p-2 text-right">
                                  <Button asChild size="sm" variant="outline" disabled={sendAllDocsSending}>
                                    <NavLink to={routes.prospect.aoa(p.id)} target="_blank" rel="noreferrer">
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
                    I understand this sends a single DocuSign envelope containing the contract and AOAs for all listed
                    properties.
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

          <NavLink to={routes.editProspect(prospect.id)}>
            <Button variant="blue" className="w-full">
              Edit Prospect Details
            </Button>
          </NavLink>
          <NavLink to={routes.prospect.contract(id)}>
            <Button variant="blue" className="w-full">
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
                <td>{prospect.clientName}</td>
              </tr>
              <tr>
                <td className="font-medium">Phone:</td>
                <td>
                  <Phone size={18} className="inline text-indigo-600 mr-2" />
                  {prospect.phoneNumber}
                </td>
              </tr>
              <tr>
                <td className="font-medium">Email:</td>
                <td>
                  <Mail size={18} className="inline text-indigo-600 mr-2" />
                  {prospect.email}
                </td>
              </tr>
              {prospect.billingEmail && prospect.billingEmail !== prospect.email && (
                <tr>
                  <td className="font-medium">Secondary Email:</td>
                  <td>
                    <Mail size={18} className="inline text-indigo-600 mr-2" />
                    {prospect.billingEmail}
                  </td>
                </tr>
              )}
              <tr>
                <td className="font-medium">Billing Address:</td>
                <td>
                  <MapPin size={18} className="inline text-indigo-600 mr-2" />
                  {prospect.billingAddress ??
                    [prospect.mailingAddress, prospect.mailingAddressCityTxZip].filter(Boolean).join(", ")}
                </td>
              </tr>
              {(prospect.contingencyFee != null && prospect.contingencyFee !== "") && (
                <tr>
                  <td className="font-medium">Contingency Fee:</td>
                  <td>{prospect.contingencyFee}%</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Contracts & AOAs</h2>
          <div className="flex items-center gap-2">
            <AlertDialog
              open={sendAllOpen}
              onOpenChange={(open) => {
                setSendAllOpen(open);
                if (!open) setSendAllAgree(false);
              }}
            >
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
                    This will send <strong>one DocuSign email/envelope</strong> to the prospect with{" "}
                    <strong>one AOA PDF per non-archived property</strong>. If any property is not eligible
                    (e.g. already sent), it may be skipped and reported as failed.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="space-y-3">
                  <div className="rounded-md border bg-muted/30 p-3 text-sm">
                    <div className="font-medium mb-2">Summary</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <span className="text-muted-foreground">Prospect:</span> {prospect.clientName}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Email:</span> {prospect.email || "—"}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Properties:</span> {nonArchivedProperties.length}
                      </div>
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
                              <td className="p-2">{p.accountNumber ?? p.AccountNumber ?? "—"}</td>
                              <td className="p-2">{p.cadCounty ?? p.CADCOUNTY ?? "—"}</td>
                              <td className="p-2">{p.nameOnCad ?? p.NAMEONCAD ?? "—"}</td>
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
                      I understand this sends a single DocuSign envelope and the prospect will receive an email to
                      sign AOAs for all listed properties.
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
          <p className="text-gray-600">No contracts or AOAs yet. Use &quot;Create Contract&quot; to preview and send.</p>
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

      <div>
        <div className="flex justify-between items-center mb-4 mt-8">
          <h1 className="text-2xl font-bold">Associated Property(s)</h1>
          <NavLink to={routes.prospect.addProperty(prospect.id)}>
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
              <ProspectPropertyBox key={property.id} property={property} />
            ))}
          </div>
        ) : (
          <h1 className="text-center text-gray-600 col-span-full">
            No properties found for the selected county.
          </h1>
        )}
      </div>
    </div>
  );
};

export default ProspectPage;

const ProspectPropertyBox: React.FC<{ property: Property }> = ({
  property,
}) => {
  const accountNumber = property.accountNumber ?? property.AccountNumber;
  const cadCounty = property.cadCounty ?? property.CADCOUNTY;
  const nameOnCad = property.nameOnCad ?? property.NAMEONCAD;

  return (
    <NavLink
      to={routes.prospect.property(property.id)}
      className="block"
    >
      <div className="border rounded-2xl p-4 shadow-md hover:shadow-lg transition duration-300 bg-gradient-to-tr from-white to-gray-50 hover:from-blue-50 cursor-pointer h-full flex flex-col justify-between">
        <div className="flex items-center gap-3 mb-4">
          <House size={24} className="text-indigo-500" />
          <h2 className="text-lg font-semibold text-gray-800">
            {accountNumber ?? "—"}
          </h2>
        </div>
        <div className="text-sm text-gray-600 mb-2">
          <span className="font-medium text-gray-700">County:</span> {cadCounty ?? "—"}
        </div>
        <div className="text-sm text-gray-600">
          <span className="font-medium text-gray-700">CAD Details:</span>{" "}
          {nameOnCad ?? "—"}
        </div>
      </div>
    </NavLink>
  );
};
