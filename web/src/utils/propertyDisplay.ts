import type { Property } from "@/types/types";

export function propertyDisplayFields(p: Property) {
  return {
    accountNumber: p.accountNumber ?? p.AccountNumber ?? "—",
    cadCounty: p.cadCounty ?? p.CADCOUNTY ?? "—",
    nameOnCad: p.nameOnCad ?? p.NAMEONCAD ?? "—",
  };
}
