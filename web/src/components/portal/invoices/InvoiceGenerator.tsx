import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { LoaderCircle, FileText, Users, Building2, Calendar, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getApiBaseUrl } from "@/api/client";

interface Client {
  clientNumber: string;
  clientName: string;
  email: string;
  phoneNumber: string;
  propertyCount: number;
}

interface Property {
  id: number;
  accountNumber: string;
  cadMailingAddress: string;
  cadCity: string;
  cadCounty: string;
  contingencyFee: string;
  flatFee: string;
  existingInvoices: unknown[];
}

interface ClientWithProperties {
  client: Client;
  properties: Property[];
}

const InvoiceGenerator = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [propertiesByClient, setPropertiesByClient] = useState<ClientWithProperties[]>([]);
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<number[]>([new Date().getFullYear()]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [stats, setStats] = useState<{
    numOfClients: number;
    numOfProspects: number;
    numOfAgents: number;
    totalInvoices?: number;
    totalAmount?: number;
    uniqueClients?: number;
    uniqueProperties?: number;
  } | null>(null);
  const { toast } = useToast();

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Available years (current year and 4 years back)
  const availableYears = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - i
  ).reverse();

  // Fetch all clients
  const fetchClients = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${getApiBaseUrl()}/invoice/clients`, {
        headers: {
          ...getAuthHeaders(),
        },
      });
      if (!response.ok) throw new Error("Failed to fetch clients");
      
      const data = await response.json();
      setClients(data.data.clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast({
        title: "Error",
        description: "Failed to fetch clients",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch properties for selected clients
  const fetchProperties = async () => {
    if (selectedClients.length === 0) {
      setPropertiesByClient([]);
      return;
    }

    try {
      setLoading(true);
      const clientNumbersParam = selectedClients.join(',');
      const response = await fetch(
        `${getApiBaseUrl()}/invoice/properties?clientNumbers=${clientNumbersParam}`,
        {
          headers: {
            ...getAuthHeaders(),
          },
        }
      );
      
      if (!response.ok) throw new Error("Failed to fetch properties");
      
      const data = await response.json();
      setPropertiesByClient(data.data.clients);
    } catch (error) {
      console.error("Error fetching properties:", error);
      toast({
        title: "Error",
        description: "Failed to fetch properties",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistics
  const fetchStats = async () => {
    if (selectedClients.length === 0) {
      setStats(null);
      return;
    }

    try {
      const clientNumbersParam = selectedClients.join(',');
      const yearsParam = selectedYears.join(',');
      const response = await fetch(
        `${getApiBaseUrl()}/invoice/stats?clientNumbers=${clientNumbersParam}&years=${yearsParam}`,
        {
          headers: {
            ...getAuthHeaders(),
          },
        }
      );
      
      if (!response.ok) throw new Error("Failed to fetch statistics");
      
      const data = await response.json();
      setStats(data.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  // Generate invoices
  const generateInvoices = async () => {
    if (selectedClients.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one client",
        variant: "destructive",
      });
      return;
    }

    if (selectedYears.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one year",
        variant: "destructive",
      });
      return;
    }

    try {
      setGenerating(true);
      const response = await fetch(`${getApiBaseUrl()}/invoice/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          clientNumbers: selectedClients,
          propertyAccountNumbers: selectedProperties.length > 0 ? selectedProperties : null,
          years: selectedYears,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to generate invoices");
      }

      const data = await response.json();
      
      toast({
        title: "Success",
        description: `Generated ${data.data.createdInvoices} invoices successfully`,
      });

      // Refresh stats
      await fetchStats();
      
    } catch (error) {
      console.error("Error generating invoices:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate invoices",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  // Handle client selection
  const handleClientSelection = (clientNumber: string, checked: boolean) => {
    if (checked) {
      setSelectedClients(prev => [...prev, clientNumber]);
    } else {
      setSelectedClients(prev => prev.filter(cn => cn !== clientNumber));
      // Remove properties for this client from selection
      const clientProperties = propertiesByClient
        .find(c => c.client.clientNumber === clientNumber)
        ?.properties.map(p => p.accountNumber) || [];
      setSelectedProperties(prev => prev.filter(p => !clientProperties.includes(p)));
    }
  };

  // Handle property selection
  const handlePropertySelection = (propertyAccountNumber: string, checked: boolean) => {
    if (checked) {
      setSelectedProperties(prev => [...prev, propertyAccountNumber]);
    } else {
      setSelectedProperties(prev => prev.filter(p => p !== propertyAccountNumber));
    }
  };

  // Handle year selection
  const handleYearSelection = (year: number, checked: boolean) => {
    if (checked) {
      setSelectedYears(prev => [...prev, year]);
    } else {
      setSelectedYears(prev => prev.filter(y => y !== year));
    }
  };

  // Select all properties for selected clients
  const selectAllProperties = () => {
    const allProperties = propertiesByClient
      .flatMap(c => c.properties)
      .map(p => p.accountNumber);
    setSelectedProperties(allProperties);
  };

  // Clear all property selections
  const clearAllProperties = () => {
    setSelectedProperties([]);
  };

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    fetchProperties();
  }, [selectedClients]);

  useEffect(() => {
    fetchStats();
  }, [selectedClients, selectedYears]);

  const totalProperties = propertiesByClient.reduce((sum, c) => sum + c.properties.length, 0);
  const totalSelectedProperties = selectedProperties.length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Invoice Generator</h1>
          <p className="text-muted-foreground">
            Generate invoices for selected clients and properties
          </p>
        </div>
        <Button
          onClick={generateInvoices}
          disabled={generating || selectedClients.length === 0 || selectedYears.length === 0}
          className="flex items-center gap-2"
        >
          {generating ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <FileText className="h-4 w-4" />
          )}
          {generating ? "Generating..." : "Generate Invoices"}
        </Button>
      </div>

      {/* Statistics Card */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Invoice Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.totalInvoices ?? 0}</div>
                <div className="text-sm text-muted-foreground">Total Invoices</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">${(stats.totalAmount ?? 0).toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">Total Amount</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.uniqueClients ?? 0}</div>
                <div className="text-sm text-muted-foreground">Unique Clients</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{stats.uniqueProperties ?? 0}</div>
                <div className="text-sm text-muted-foreground">Unique Properties</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Select Clients
            </CardTitle>
            <CardDescription>
              Choose clients to generate invoices for
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <LoaderCircle className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {clients.map((client) => (
                  <div key={client.clientNumber} className="flex items-center space-x-3">
                    <Checkbox
                      id={client.clientNumber}
                      checked={selectedClients.includes(client.clientNumber)}
                      onCheckedChange={(checked) => 
                        handleClientSelection(client.clientNumber, checked as boolean)
                      }
                    />
                    <label
                      htmlFor={client.clientNumber}
                      className="flex-1 cursor-pointer"
                    >
                      <div className="font-medium">{client.clientName}</div>
                      <div className="text-sm text-muted-foreground">
                        {client.clientNumber} • {client.propertyCount} properties
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Year Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Select Years
            </CardTitle>
            <CardDescription>
              Choose years to generate invoices for
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {availableYears.map((year) => (
                <div key={year} className="flex items-center space-x-3">
                  <Checkbox
                    id={`year-${year}`}
                    checked={selectedYears.includes(year)}
                    onCheckedChange={(checked) => 
                      handleYearSelection(year, checked as boolean)
                    }
                  />
                  <label
                    htmlFor={`year-${year}`}
                    className="flex-1 cursor-pointer font-medium"
                  >
                    {year}
                  </label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Property Selection */}
      {selectedClients.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Select Properties
            </CardTitle>
            <CardDescription>
              Choose specific properties (optional - leave empty to select all properties for selected clients)
            </CardDescription>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllProperties}
                disabled={totalProperties === 0}
              >
                Select All ({totalProperties})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllProperties}
                disabled={totalSelectedProperties === 0}
              >
                Clear All
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <LoaderCircle className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-4">
                {propertiesByClient.map((clientData) => (
                  <div key={clientData.client.clientNumber} className="space-y-2">
                    <h3 className="font-semibold text-lg">
                      {clientData.client.clientName} ({clientData.client.clientNumber})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {clientData.properties.map((property) => (
                        <div key={property.accountNumber} className="flex items-center space-x-3 p-3 border rounded-lg">
                          <Checkbox
                            id={property.accountNumber}
                            checked={selectedProperties.includes(property.accountNumber)}
                            onCheckedChange={(checked) => 
                              handlePropertySelection(property.accountNumber, checked as boolean)
                            }
                          />
                          <label
                            htmlFor={property.accountNumber}
                            className="flex-1 cursor-pointer"
                          >
                            <div className="font-medium">{property.accountNumber}</div>
                            <div className="text-sm text-muted-foreground">
                              {property.cadMailingAddress}, {property.cadCity}, {property.cadCounty}
                            </div>
                            <div className="text-sm">
                              {property.contingencyFee && (
                                <Badge variant="secondary" className="mr-1">
                                  Contingency: ${property.contingencyFee}
                                </Badge>
                              )}
                              {property.flatFee && (
                                <Badge variant="outline">
                                  Flat Fee: ${property.flatFee}
                                </Badge>
                              )}
                            </div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      {selectedClients.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Generation Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{selectedClients.length}</div>
                <div className="text-sm text-muted-foreground">Selected Clients</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{totalSelectedProperties || totalProperties}</div>
                <div className="text-sm text-muted-foreground">Properties</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{selectedYears.length}</div>
                <div className="text-sm text-muted-foreground">Years</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {(totalSelectedProperties || totalProperties) * selectedYears.length}
                </div>
                <div className="text-sm text-muted-foreground">Total Invoices</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InvoiceGenerator; 