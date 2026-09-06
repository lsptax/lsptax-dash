import { InvoiceData } from "@/types/types";
import { normalizeInvoiceClient } from "@/utils/clientContact";
import type { InvoiceEmailTracking } from "@/utils/invoiceEmailStatus";

export type InvoiceNormalizationResult = {
  invoiceData?: InvoiceData;
  debug: Record<string, unknown>;
};

function extractLastDelivery(raw: unknown): InvoiceEmailTracking | null | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const envelope = raw as Record<string, unknown>;
  if ("lastDelivery" in envelope) {
    return (envelope.lastDelivery as InvoiceEmailTracking | null) ?? null;
  }
  return undefined;
}

function attachLastDelivery(
  invoiceData: InvoiceData,
  raw: unknown,
  source?: unknown
): InvoiceData {
  const fromSource = source !== undefined ? extractLastDelivery(source) : undefined;
  const fromRaw = extractLastDelivery(raw);
  const lastDelivery = fromSource !== undefined ? fromSource : fromRaw;
  if (lastDelivery === undefined) return invoiceData;
  return { ...invoiceData, lastDelivery };
}

type InvoicePropertyDetails = InvoiceData["properties"][number]["propertyDetails"];
type InvoiceRecord = InvoiceData["properties"][number]["invoice"][number];

const asPropertyDetails = (details: Record<string, unknown>): InvoicePropertyDetails =>
  details as unknown as InvoicePropertyDetails;

const asInvoiceRecord = (invoice: { [key: string]: unknown }): InvoiceRecord =>
  invoice as unknown as InvoiceRecord;

const resolvePropertyDetails = (
  topLevel: unknown,
  invoices: Array<Record<string, unknown>>
): Record<string, unknown> | undefined => {
  const fromTop =
    topLevel && typeof topLevel === "object"
      ? (topLevel as Record<string, unknown>)
      : undefined;
  const fromInvoice = invoices
    .map((invoice) => invoice.propertyDetails)
    .find((details) => details && typeof details === "object") as
    | Record<string, unknown>
    | undefined;

  if (fromTop && fromInvoice) return { ...fromTop, ...fromInvoice };
  return fromInvoice ?? fromTop;
};

const mapPropertyOnlyPayload = (payload: unknown): InvoiceData | undefined => {
  if (!payload || typeof payload !== "object") return undefined;

  const maybePayload = payload as {
    propertyDetails?: unknown;
    invoices?: unknown;
    client?: unknown;
    clientDetails?: unknown;
  };

  if (!Array.isArray(maybePayload.invoices) || maybePayload.invoices.length === 0) {
    return undefined;
  }

  const invoices = maybePayload.invoices as Array<Record<string, unknown>>;
  const defaultPropertyDetails = resolvePropertyDetails(
    maybePayload.propertyDetails,
    invoices
  );
  if (!defaultPropertyDetails) return undefined;

  const client = normalizeInvoiceClient(
    maybePayload.client ?? maybePayload.clientDetails,
    defaultPropertyDetails
  );

  const propertyMap = new Map<string, InvoiceData["properties"][number]>();

  for (const invoice of invoices) {
    const embeddedDetails = invoice.propertyDetails as Record<string, unknown> | undefined;
    const propertyDetails = asPropertyDetails(
      embeddedDetails
        ? { ...defaultPropertyDetails, ...embeddedDetails }
        : defaultPropertyDetails
    );

    const propertyKey = String(invoice.propertyId ?? propertyDetails.id ?? "default");
    const { propertyDetails: _ignored, ...invoiceRecord } = invoice;

    if (!propertyMap.has(propertyKey)) {
      propertyMap.set(propertyKey, { propertyDetails, invoice: [] });
    }

    propertyMap.get(propertyKey)!.invoice.push(asInvoiceRecord(invoiceRecord));
  }

  return {
    client,
    properties: Array.from(propertyMap.values()),
  };
};

const mapCandidateToInvoice = (candidate: unknown): InvoiceData | undefined => {
  const propertyOnly = mapPropertyOnlyPayload(candidate);
  if (propertyOnly) return propertyOnly;

  if (!candidate || typeof candidate !== "object") return undefined;

  const maybeInvoice = candidate as {
    client?: unknown;
    clientDetails?: unknown;
    properties?: unknown;
    propertyDetails?: unknown;
    invoices?: unknown;
  };

  const client = normalizeInvoiceClient(
    maybeInvoice.client ?? maybeInvoice.clientDetails,
    maybeInvoice.propertyDetails as Record<string, unknown> | undefined
  );
  let properties = (maybeInvoice.properties ?? []) as unknown;

  if (
    (!Array.isArray(properties) || properties.length === 0) &&
    maybeInvoice.propertyDetails &&
    Array.isArray(maybeInvoice.invoices)
  ) {
    properties = [
      {
        propertyDetails: maybeInvoice.propertyDetails,
        invoice: maybeInvoice.invoices,
      },
    ];
  }

  if (!client || !Array.isArray(properties)) return undefined;
  return { client, properties: properties as InvoiceData["properties"] };
};

export const normalizeInvoiceData = (raw: unknown): InvoiceNormalizationResult => {
  if (!raw) return { debug: { reason: "empty raw payload", rawType: typeof raw } };

  const source = (raw as { data?: unknown }).data ?? raw;
  const sourceArray = Array.isArray(source) ? source : [source];

  const propertyOnly = mapPropertyOnlyPayload(source);
  if (propertyOnly) {
    return {
      invoiceData: attachLastDelivery(propertyOnly, raw, source),
      debug: {
        sourceType: Array.isArray(source) ? "array" : "single",
        sourceLength: sourceArray.length,
        normalizedAs: "property-only-payload",
        mappedProperties: propertyOnly.properties.length,
      },
    };
  }

  if (sourceArray.length > 0 && sourceArray.every((item) => item && typeof item === "object")) {
    const first = sourceArray[0] as {
      client?: unknown;
      clientDetails?: unknown;
      propertyDetails?: unknown;
      invoices?: unknown;
    };
    if (
      (first.client || first.clientDetails) &&
      first.propertyDetails &&
      Array.isArray(first.invoices)
    ) {
      const client = normalizeInvoiceClient(
        first.client ?? first.clientDetails,
        first.propertyDetails as Record<string, unknown> | undefined
      );
      const properties = sourceArray
        .map((item) => item as { propertyDetails?: unknown; invoices?: unknown })
        .filter((item) => item.propertyDetails && Array.isArray(item.invoices))
        .map((item) => ({
          propertyDetails: item.propertyDetails,
          invoice: item.invoices,
        }));

      return {
        invoiceData: attachLastDelivery(
          { client, properties: properties as InvoiceData["properties"] },
          raw,
          source
        ),
        debug: {
          sourceType: Array.isArray(source) ? "array" : "single",
          sourceLength: sourceArray.length,
          normalizedAs: "property-payload-array",
          mappedProperties: properties.length,
        },
      };
    }
  }

  const mapped = sourceArray.map(mapCandidateToInvoice).find(Boolean);
  if (mapped) {
    return {
      invoiceData: attachLastDelivery(mapped, raw, source),
      debug: {
        sourceType: Array.isArray(source) ? "array" : "single",
        sourceLength: sourceArray.length,
        normalizedAs: "single-candidate",
        propertyCount: mapped.properties.length,
      },
    };
  }

  const firstObject = sourceArray.find((item) => item && typeof item === "object") as
    | Record<string, unknown>
    | undefined;
  return {
    debug: {
      sourceType: Array.isArray(source) ? "array" : "single",
      sourceLength: sourceArray.length,
      firstObjectKeys: firstObject ? Object.keys(firstObject) : [],
      reason: "Could not map payload to InvoiceData",
    },
  };
};
