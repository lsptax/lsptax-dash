export const PROPERTY_TYPES = ["RESIDENTIAL", "COMMERCIAL", "BPP", "LAND"];

export const ASSIGNABLE_STAFF_TYPES = ["owner", "admin", "staff"];

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
