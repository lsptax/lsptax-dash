import { getAuthHeaders, getApiBaseUrl } from "./client";

const baseUrl = () => {
  const url = getApiBaseUrl();
  if (!url && !import.meta.env.DEV) throw new Error("Server URL is not configured. Please set VITE_BACKEND_URL.");
  return url;
};

export const addProspect = async (payload: {
  clientName: string;
  email: string;
  phoneNumber?: string;
  mailingAddress?: string;
  mailingAddressCityTxZip?: string;
  contingencyFee?: string;
}) => {
  try {
    const response = await fetch(`${baseUrl()}/action/add-prospect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        clientName: payload.clientName,
        email: payload.email,
        phoneNumber: payload.phoneNumber ?? "",
        mailingAddress: payload.mailingAddress ?? "",
        mailingAddressCityTxZip: payload.mailingAddressCityTxZip ?? "",
        contingencyFee: payload.contingencyFee ?? "",
      }),
    });
    const text = await response.text();
    let result: Record<string, unknown> = {};
    if (text) {
      try {
        result = JSON.parse(text);
      } catch {
        // non-JSON response
      }
    }
    if (!response.ok) {
      const msg = (result?.message as string) || (result?.error as string) || "Failed to add prospect";
      throw new Error(msg);
    }
    return result;
  } catch (error: unknown) {
    if (error instanceof Error) throw error;
    throw new Error("Prospect addition failed. Please try again.");
  }
};

export const addClient = async (clientDetails: {
  clientName: string;
  clientNumber: string;
  email: string;
  phoneNumber?: string;
  mailingAddressCityTxZip?: string;
  typeOfAcct?: string;
  billingEmail?: string;
  billingAddress?: string;
  contingencyFee?: string;
}) => {
  try {
    const body: Record<string, string> = {
      clientName: clientDetails.clientName,
      clientNumber: clientDetails.clientNumber,
      email: clientDetails.email,
      phoneNumber: clientDetails.phoneNumber ?? "",
      mailingAddressCityTxZip: clientDetails.mailingAddressCityTxZip ?? "",
      typeOfAcct: clientDetails.typeOfAcct ?? "",
    };
    if (clientDetails.billingEmail != null) body.billingEmail = clientDetails.billingEmail;
    if (clientDetails.billingAddress != null) body.billingAddress = clientDetails.billingAddress;
    if (clientDetails.contingencyFee != null && clientDetails.contingencyFee !== "") body.contingencyFee = clientDetails.contingencyFee;
    const response = await fetch(`${baseUrl()}/action/add-client`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to add client");
    return data;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Client Addition Failed. Please try again.";
    throw new Error(errorMessage);
  }
};

export const editProperty = async (
  propertyId: string,
  propertyDetails: Record<string, unknown>,
  yearlyData: Record<number, Record<string, unknown>>
) => {
  try {
    const response = await fetch(`${baseUrl()}/action/edit-property`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ propertyId: Number(propertyId), propertyDetails, yearlyData }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Failed to update property");
    }
    return response.json();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Property Update Failed. Please try again.";
    throw new Error(errorMessage);
  }
};

export const editClient = async (clientId: string, clientDetails: Record<string, unknown>) => {
  try {
    const response = await fetch(`${baseUrl()}/action/edit-client`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ clientId: Number(clientId), clientDetails }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Failed to update client");
    }
    const text = await response.text();
    return text ? JSON.parse(text) : {};
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Client Update Failed. Please try again.";
    throw new Error(errorMessage);
  }
};

export const editProspect = async (prospectId: string, prospectDetails: Record<string, unknown>) => {
  try {
    const response = await fetch(`${baseUrl()}/action/edit-prospect`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ prospectId: Number(prospectId), prospectDetails }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Failed to update prospect");
    }
    return response.json();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Prospect Update Failed. Please try again.";
    throw new Error(errorMessage);
  }
};

export const deleteProperty = async (propertyId: string) => {
  try {
    const response = await fetch(`${baseUrl()}/action/delete-property`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ id: Number(propertyId) }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to delete property");
    }
    return response.json();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Property Deletion Failed. Please try again.";
    throw new Error(errorMessage);
  }
};

export const editProspectProperty = async (
  propertyId: string,
  propertyDetails: Record<string, unknown>
) => {
  try {
    const response = await fetch(`${baseUrl()}/action/edit-prospect-property`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ propertyId: Number(propertyId), propertyDetails }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Failed to update property");
    }
    return response.json();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Property Update Failed. Please try again.";
    throw new Error(errorMessage);
  }
};

export const addProperty = async ({
  clientId,
  propertyData,
}: {
  clientId: number;
  propertyData: Record<string, unknown>;
}) => {
  const response = await fetch(`${baseUrl()}/action/add-property`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ clientId, propertyData }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || error.message || "Failed to add property");
  }
  return response.json();
};

export const addProspectProperty = async ({
  id,
  propertyData,
}: {
  id: number;
  propertyData: Record<string, unknown>;
}) => {
  const response = await fetch(`${baseUrl()}/action/add-prospect-property`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ id, propertyData }),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to add property");
  }
  return response.json();
};

export const deleteProspectProperty = async (propertyId: string) => {
  try {
    const response = await fetch(`${baseUrl()}/action/delete-prospect-property`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ id: Number(propertyId) }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to delete property");
    }
    return response.json();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Property Deletion Failed. Please try again.";
    throw new Error(errorMessage);
  }
};

export const deleteClient = async (id: Number) => {
  try {
    const response = await fetch(`${baseUrl()}/action/delete-client`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ id }),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(text || "Failed to delete client");
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Client Deletion Failed. Please try again.";
    throw new Error(errorMessage);
  }
};

export const deleteProspect = async (id: Number) => {
  try {
    const response = await fetch(`${baseUrl()}/action/delete-prospect`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ id }),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(text || "Failed to delete prospect");
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Prospect Deletion Failed. Please try again.";
    throw new Error(errorMessage);
  }
};

export const moveProspectToClient = async (id: Number) => {
  try {
    const response = await fetch(`${baseUrl()}/action/move-to-client`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ id }),
    });
    if (!response.ok) throw new Error("Failed to move prospect to client.");
    const data = await response.json();
    return data.client;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Prospect Moving Failed. Please try again.";
    throw new Error(errorMessage);
  }
};

export const changeProspectStatus = async ({
  prospectId,
  newStatus,
}: {
  prospectId: Number;
  newStatus: String;
}) => {
  try {
    const response = await fetch(`${baseUrl()}/action/change-prospect-status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ prospectId, newStatus }),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(text || "Failed to change prospect status");
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Prospect Status Updation Failed. Please try again.";
    throw new Error(errorMessage);
  }
};

export const sendContract = async ({ prospectId }: { prospectId: Number }) => {
  try {
    const response = await fetch(`${baseUrl()}/action/sign-aoa`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ prospectId }),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(text || "Failed to send contract");
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Not able to send Contract to prospect. Please try again.";
    throw new Error(errorMessage);
  }
};

export const sendAOAToClient = async ({
  clientId,
  propertyId,
}: {
  clientId: string;
  propertyId?: number;
}) => {
  try {
    const response = await fetch(`${baseUrl()}/action/sign-aoa`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ clientId, propertyId }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Failed to send AOA to client");
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Not able to send AOA to client. Please try again.";
    throw new Error(errorMessage);
  }
};

export const sendClientContract = async ({ clientId }: { clientId: string }) => {
  try {
    const response = await fetch(`${baseUrl()}/action/sign-aoa`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ clientId }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Failed to send contract to client");
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Not able to send contract to client. Please try again.";
    throw new Error(errorMessage);
  }
};

export const downloadSignedPDF = async ({ prospectId }: { prospectId: number }) => {
  try {
    const response = await fetch(`${baseUrl()}/action/download-signed-pdf`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ prospectId }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Failed to download signed documents");
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `signed_documents_${prospectId}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Error downloading signed documents:", error);
    throw new Error("Error downloading signed documents. Please try again.");
  }
};

export const addHearing = async (payload: {
  propertyId: number;
  date: string;
  notes?: string;
  status?: string;
}) => {
  const response = await fetch(`${baseUrl()}/action/add-hearing`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  let result: Record<string, unknown> = {};
  if (text) {
    try {
      result = JSON.parse(text);
    } catch {
      // non-JSON
    }
  }
  if (!response.ok) {
    const msg = (result?.message as string) || (result?.error as string) || "Failed to schedule hearing";
    throw new Error(msg);
  }
  return result;
};

export const editHearing = async (payload: {
  hearingId: number;
  date?: string;
  notes?: string;
  status?: string;
}) => {
  const response = await fetch(`${baseUrl()}/action/edit-hearing`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  let result: Record<string, unknown> = {};
  if (text) {
    try {
      result = JSON.parse(text);
    } catch {
      // non-JSON
    }
  }
  if (!response.ok) {
    const msg = (result?.message as string) || (result?.error as string) || "Failed to update hearing";
    throw new Error(msg);
  }
  return result;
};

/** Soft-delete: sets `deletedAt`; row excluded from lists and stats. */
export const deleteHearing = async (
  hearingId: number,
): Promise<{ message?: string; hearingId?: number; deletedAt?: string }> => {
  const response = await fetch(`${baseUrl()}/action/delete-hearing`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ hearingId }),
  });
  const text = await response.text();
  let result: Record<string, unknown> = {};
  if (text) {
    try {
      result = JSON.parse(text);
    } catch {
      // non-JSON
    }
  }
  if (!response.ok) {
    const msg = (result?.message as string) || (result?.error as string) || "Failed to delete hearing";
    throw new Error(msg);
  }
  return result;
};

export const archiveItem = async (tableName: string, id: number) => {
  try {
    const response = await fetch(`${baseUrl()}/action/archive-entity`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ tableName, id }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to archive item");
    }
    return response.json();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Archiving Failed. Please try again.";
    throw new Error(errorMessage);
  }
};
