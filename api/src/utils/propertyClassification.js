export const PROPERTY_TYPES = ["RESIDENTIAL", "COMMERCIAL", "BPP", "LAND"];

/** Residential, commercial, and land are real property. A blank type is Real too. BPP is its own account type. */
export const REAL_PROPERTY_TYPES = ["RESIDENTIAL", "COMMERCIAL", "LAND"];

export const ASSIGNABLE_STAFF_TYPES = ["owner", "admin", "staff"];

/** Blank, residential, commercial, and land export as Real. BPP stays BPP. */
export function realOrBppLabel(propertyType) {
  const key = propertyType == null ? "" : String(propertyType).trim().toUpperCase();
  if (key === "BPP") return "BPP";
  if (!key || REAL_PROPERTY_TYPES.includes(key)) return "Real";
  return "";
}

/**
 * Properties list Account Type filter. Uses only the property's own type.
 * `unassigned` is a property with no type yet.
 * @param {"real" | "bpp" | "unassigned" | null | undefined} normalizedAccountType
 */
export function propertyAccountTypeWhere(normalizedAccountType) {
  if (!normalizedAccountType) return {};
  if (normalizedAccountType === "unassigned") return { propertyType: null };
  if (normalizedAccountType === "bpp") return { propertyType: "BPP" };
  if (normalizedAccountType === "real") {
    return {
      OR: [{ propertyType: null }, { propertyType: { in: REAL_PROPERTY_TYPES } }],
    };
  }
  return { __invalidAccountType: true };
}

export function parsePropertyType(raw) {
  if (raw == null || String(raw).trim() === "" || String(raw).trim().toUpperCase() === "NONE") {
    return { ok: true, value: null };
  }
  const key = String(raw).trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (!PROPERTY_TYPES.includes(key)) return { ok: false, value: null };
  return { ok: true, value: key };
}

export function isAssignableStaffType(type) {
  return ASSIGNABLE_STAFF_TYPES.includes(String(type || "").trim().toLowerCase());
}
