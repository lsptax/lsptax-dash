import { ClientData } from "@/types/types";

function pickString(...values: unknown[]): string {
  for (const value of values) {
    if (value == null) continue;
    const trimmed = String(value).trim();
    if (trimmed) return trimmed;
  }
  return "";
}

/** Resolve billing email (preferred) or primary email from client payload variants. */
export function getClientRecipientEmail(client: ClientData): string | undefined {
  const email = pickString(client.billingEmail, client.BillingEmail, client.email, client.Email);
  return email || undefined;
}

export function getClientPhoneNumber(client: ClientData): string | undefined {
  const phone = pickString(client.phoneNumber, client.PHONENUMBER);
  return phone || undefined;
}

/** Normalize client contact + display fields from invoice/property API payloads. */
export function normalizeInvoiceClient(
  raw: unknown,
  propertyDetails?: Record<string, unknown>
): ClientData {
  const c = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const pd = propertyDetails ?? {};

  return {
    ...(c as unknown as ClientData),
    id: Number(c.id ?? pd.clientId ?? 0),
    clientName: pickString(c.clientName, c.CLIENTNAME, pd.clientName, pd.nameOnCad),
    clientNumber: pickString(c.clientNumber, c.CLIENTNumber, pd.clientNumber),
    mailingAddress: pickString(c.mailingAddress, c.MAILINGADDRESS, pd.mailingAddress),
    mailingAddressCityTxZip: pickString(
      c.mailingAddressCityTxZip,
      c.MAILINGADDRESSCITYTXZIP,
      pd.mailingAddressCityTxZip
    ),
    email: pickString(c.email, c.Email, pd.email, pd.Email) || undefined,
    billingEmail: pickString(c.billingEmail, c.BillingEmail) || undefined,
    phoneNumber: pickString(c.phoneNumber, c.PHONENUMBER, pd.phoneNumber, pd.PHONENUMBER) || undefined,
    contingencyFee: String(c.contingencyFee ?? pd.contingencyFee ?? "0"),
  };
}
