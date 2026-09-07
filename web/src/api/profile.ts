import { authFetch, getApiBaseUrl } from "@/api/client";

export type PortalProfile = {
  id: number;
  name: string;
  email: string;
  type: string;
};

async function readJson<T>(res: Response, fallback: string): Promise<T> {
  if (res.status === 403) throw new Error("You do not have access to this page.");
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof body?.message === "string" ? body.message : fallback);
  }
  return body as T;
}

export async function getProfile(): Promise<PortalProfile> {
  const res = await authFetch(`${getApiBaseUrl()}/api/profile`);
  return readJson<PortalProfile>(res, "Failed to load profile");
}

export async function updateProfile(input: {
  name: string;
  email: string;
}): Promise<PortalProfile> {
  const res = await authFetch(`${getApiBaseUrl()}/api/profile`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readJson<PortalProfile>(res, "Failed to update profile");
}

export async function updatePassword(input: {
  currentPassword: string;
  newPassword: string;
}): Promise<void> {
  const res = await authFetch(`${getApiBaseUrl()}/api/profile/password`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  await readJson(res, "Failed to update password");
}
