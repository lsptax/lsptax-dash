/**
 * Allowed fields for Prisma update calls (mass-assignment protection).
 *
 * clientId = Client.id (system-generated). Use for all APIs and relations.
 * clientNumber = user-entered only; not used in any query (display/export only).
 */

export const CLIENT_UPDATE_FIELDS = [
  "prospectStatus",
  "typeOfAcct",
  "clientName",
  "clientNumber",
  "email",
  "billingEmail",
  "phoneNumber",
  "nameOnCad",
  "mailingAddress",
  "mailingAddressCityTxZip",
  "billingAddress",
  "contingencyFee",
  "flatFee",
  "envelopeId",
  "isArchived",
];

export const PROPERTY_UPDATE_FIELDS = [
  "statusNotes",
  "otherNotes",
  "nameOnCad",
  "mailingAddress",
  "mailingAddressCityTxZip",
  "propertyAddress",
  "cadMailingAddress",
  "cadCity",
  "cadZipCode",
  "cadCounty",
  "accountNumber",
  "contactOwner",
  "subcontractOwner",
  "bppFee",
  "flatFee",
  "aoaSigned",
  "hearingDate",
  "isArchived",
  // Roadmap Phase 1 position (see `propertyLifecycle.js`); history / completed-at are server-managed on write
  "lifecyclePhase",
  "lifecycleStep",
  "lifecycleNotes",
];

/** Pick only allowed keys from obj. */
export const pick = (obj, keys) =>
  keys.reduce((acc, k) => {
    if (obj != null && Object.prototype.hasOwnProperty.call(obj, k)) acc[k] = obj[k];
    return acc;
  }, {});
