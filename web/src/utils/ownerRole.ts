export const OWNER_DASHBOARD_ROLES = new Set(["owner", "admin"]);

export type PortalUser = {
  id?: number;
  email?: string;
  name?: string;
  type?: string;
};

export function readStoredUser(): PortalUser | null {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PortalUser;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function isOwnerDashboardRole(type?: string | null): boolean {
  return OWNER_DASHBOARD_ROLES.has(String(type || "").trim().toLowerCase());
}

export function currentUserCanViewOwnerDashboard(): boolean {
  return isOwnerDashboardRole(readStoredUser()?.type);
}
