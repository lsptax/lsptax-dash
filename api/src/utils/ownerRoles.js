/** Portal users who may see the owner financial dashboard (Q-05 default). */
export const OWNER_DASHBOARD_ROLES = new Set(["owner", "admin"]);

export function normalizeUserType(type) {
  return String(type || "").trim().toLowerCase();
}

export function isOwnerDashboardRole(type) {
  return OWNER_DASHBOARD_ROLES.has(normalizeUserType(type));
}
