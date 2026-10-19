import { isOwnerDashboardRole, normalizeUserType } from "./ownerRoles.js";

export const PORTAL_USER_TYPES = ["owner", "admin", "staff", "client"];

export function parsePortalUserType(raw) {
  const type = normalizeUserType(raw);
  if (!PORTAL_USER_TYPES.includes(type)) return null;
  return type;
}

/** Error when this change would leave the portal with no owner or admin. */
export function lastManagementUserError(currentType, nextType, otherManagementCount) {
  const leaving =
    isOwnerDashboardRole(currentType) && !isOwnerDashboardRole(nextType);
  if (leaving && otherManagementCount < 1) {
    return "Keep at least one owner or admin account.";
  }
  return null;
}
