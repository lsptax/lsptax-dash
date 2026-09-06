/**
 * Field-level completeness report for Client and Property records in the DB.
 */

/** @typedef {{ field: string, label: string, required?: boolean }} FieldSpec */

/** @type {FieldSpec[]} */
export const CLIENT_COMPLETENESS_FIELDS = [
  { field: "clientNumber", label: "Client Number", required: true },
  { field: "clientName", label: "Client Name", required: true },
  { field: "nameOnCad", label: "CAD Name", required: true },
  { field: "typeOfAcct", label: "Account Type" },
  { field: "email", label: "Email" },
  { field: "billingEmail", label: "Billing Email" },
  { field: "phoneNumber", label: "Phone Number" },
  { field: "mailingAddress", label: "Mailing Address" },
  { field: "mailingAddressCityTxZip", label: "Mailing City/TX/ZIP" },
  { field: "billingAddress", label: "Billing Address" },
  { field: "contingencyFee", label: "Contingency Fee" },
  { field: "flatFee", label: "Flat Fee" },
];

/** @type {FieldSpec[]} */
export const PROPERTY_COMPLETENESS_FIELDS = [
  { field: "accountNumber", label: "Account Number", required: true },
  { field: "clientNumber", label: "Client Number", required: true },
  { field: "nameOnCad", label: "CAD Name", required: true },
  { field: "propertyAddress", label: "Property Address" },
  { field: "mailingAddress", label: "Mailing Address" },
  { field: "mailingAddressCityTxZip", label: "Mailing City/TX/ZIP" },
  { field: "cadMailingAddress", label: "CAD Mailing Address" },
  { field: "cadCity", label: "CAD City" },
  { field: "cadZipCode", label: "CAD ZIP" },
  { field: "cadCounty", label: "CAD County" },
  { field: "bppFee", label: "BPP Fee" },
  { field: "flatFee", label: "Flat Fee" },
];

export function isFieldPopulated(value) {
  if (value == null) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (typeof value === "number" || typeof value === "boolean") return true;
  if (typeof value === "object" && typeof value.toString === "function") {
    const s = String(value).trim();
    return s !== "" && s !== "null";
  }
  return true;
}

function fieldStats(rows, specs) {
  const total = rows.length;
  return specs.map(({ field, label, required }) => {
    const populated = rows.filter((r) => isFieldPopulated(r[field])).length;
    const missing = total - populated;
    return {
      field,
      label,
      required: Boolean(required),
      populated,
      missing,
      percentComplete: total === 0 ? 100 : Math.round((populated / total) * 1000) / 10,
    };
  });
}

function rowsMissingRequired(rows, specs) {
  const required = specs.filter((s) => s.required);
  return rows.filter((row) =>
    required.some(({ field }) => !isFieldPopulated(row[field]))
  );
}

/**
 * @param {object} params
 * @param {object[]} params.clients
 * @param {object[]} params.properties
 * @param {string} [params.generatedAt]
 */
export function buildClientPropertyCompletenessReport({
  clients,
  properties,
  generatedAt = new Date().toISOString(),
}) {
  const clientFieldStats = fieldStats(clients, CLIENT_COMPLETENESS_FIELDS);
  const propertyFieldStats = fieldStats(properties, PROPERTY_COMPLETENESS_FIELDS);

  const clientsMissingRequired = rowsMissingRequired(clients, CLIENT_COMPLETENESS_FIELDS);
  const propertiesMissingRequired = rowsMissingRequired(
    properties,
    PROPERTY_COMPLETENESS_FIELDS
  );

  const fullyCompleteClients = clients.filter(
    (c) => !CLIENT_COMPLETENESS_FIELDS.some(({ field, required }) => required && !isFieldPopulated(c[field]))
  ).length;

  const fullyCompleteProperties = properties.filter(
    (p) => !PROPERTY_COMPLETENESS_FIELDS.some(({ field, required }) => required && !isFieldPopulated(p[field]))
  ).length;

  return {
    generatedAt,
    summary: {
      totalClients: clients.length,
      totalProperties: properties.length,
      clientsFullyComplete: fullyCompleteClients,
      propertiesFullyComplete: fullyCompleteProperties,
      clientsMissingAnyRequired: clientsMissingRequired.length,
      propertiesMissingAnyRequired: propertiesMissingRequired.length,
    },
    clients: {
      fieldStats: clientFieldStats,
      missingRequiredCount: clientsMissingRequired.length,
      samplesMissingRequired: clientsMissingRequired.slice(0, 25).map((c) => ({
        id: c.id,
        clientNumber: c.clientNumber,
        clientName: c.clientName,
        missingFields: CLIENT_COMPLETENESS_FIELDS.filter(
          ({ field, required }) => required && !isFieldPopulated(c[field])
        ).map(({ field }) => field),
      })),
    },
    properties: {
      fieldStats: propertyFieldStats,
      missingRequiredCount: propertiesMissingRequired.length,
      samplesMissingRequired: propertiesMissingRequired.slice(0, 25).map((p) => ({
        id: p.id,
        clientNumber: p.clientNumber,
        accountNumber: p.accountNumber,
        missingFields: PROPERTY_COMPLETENESS_FIELDS.filter(
          ({ field, required }) => required && !isFieldPopulated(p[field])
        ).map(({ field }) => field),
      })),
    },
  };
}

export function formatClientPropertyCompletenessHumanReadable(report) {
  const lines = [];
  const s = report.summary;

  lines.push("Client & Property data completeness");
  lines.push("===================================");
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push("");
  lines.push("Summary");
  lines.push("-------");
  lines.push(`Clients: ${s.totalClients} total, ${s.clientsFullyComplete} with all required fields`);
  lines.push(
    `Properties: ${s.totalProperties} total, ${s.propertiesFullyComplete} with all required fields`
  );
  lines.push(
    `Missing required fields: ${s.clientsMissingAnyRequired} clients, ${s.propertiesMissingAnyRequired} properties`
  );
  lines.push("");

  const printFieldTable = (title, stats) => {
    lines.push(title);
    lines.push("-".repeat(title.length));
    for (const f of stats) {
      const req = f.required ? " [required]" : "";
      lines.push(
        `  ${f.label}${req}: ${f.populated}/${f.populated + f.missing} (${f.percentComplete}%)`
      );
    }
    lines.push("");
  };

  printFieldTable("Client fields", report.clients.fieldStats);
  printFieldTable("Property fields", report.properties.fieldStats);

  const printSamples = (title, samples) => {
    lines.push(title);
    lines.push("-".repeat(title.length));
    if (samples.length === 0) {
      lines.push("(none)");
    } else {
      for (const row of samples) {
        lines.push(
          `  id=${row.id}  clientNumber=${row.clientNumber ?? ""}  missing=[${row.missingFields.join(", ")}]` +
            (row.clientName != null ? `  clientName=${row.clientName}` : "") +
            (row.accountNumber != null ? `  accountNumber=${row.accountNumber}` : "")
        );
      }
    }
    lines.push("");
  };

  printSamples("Sample clients missing required fields (up to 25)", report.clients.samplesMissingRequired);
  printSamples(
    "Sample properties missing required fields (up to 25)",
    report.properties.samplesMissingRequired
  );

  return lines.join("\n");
}
