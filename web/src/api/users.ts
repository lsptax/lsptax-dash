import { authFetch, getApiBaseUrl } from "@/api/client";

export type PortalUser = {
  id: number;
  name: string;
  email: string;
  type: string;
  createdAt: string;
};

async function readJson<T>(res: Response, fallback: string): Promise<T> {
  if (res.status === 403) {
    throw new Error("This is limited to management users.");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof body?.message === "string" ? body.message : fallback);
  }
  return body as T;
}

export async function listPortalUsers(): Promise<PortalUser[]> {
  const res = await authFetch(`${getApiBaseUrl()}/api/users`);
  const data = await readJson<{ users?: PortalUser[] }>(res, "Failed to load users");
  return data.users ?? [];
}

export async function updatePortalUser(
  id: number,
  input: { name: string; type: string }
): Promise<PortalUser> {
  const res = await authFetch(`${getApiBaseUrl()}/api/users/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return readJson<PortalUser>(res, "Failed to update user");
}

export async function deletePortalUser(id: number): Promise<void> {
  const res = await authFetch(`${getApiBaseUrl()}/api/users/${id}`, {
    method: "DELETE",
  });
  await readJson(res, "Failed to delete user");
}
