/**
 * Import idempotency: skip creating a property if this client already has one with the same account number.
 * Account numbers are not globally unique — the same value may exist on other clients' properties.
 */
export function propertyImportIdentityKey(clientNumber, p) {
  const cn = String(clientNumber ?? "").trim();
  const acct = p?.accountNumber != null ? String(p.accountNumber).trim() : "";
  return `${cn}|${acct}`;
}
