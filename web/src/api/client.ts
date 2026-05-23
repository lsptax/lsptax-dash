/**
 * Shared API client: auth headers and authenticated fetch with 401 handling.
 * Used by both api.ts (mutations) and store/data.ts (queries).
 *
 * In development we use relative URLs so the Vite dev server can proxy to the
 * backend and avoid CORS. In production we use VITE_BACKEND_URL.
 *
 * Security: Requests use credentials: 'include' so the browser sends cookies.
 * For production, the backend should set an httpOnly cookie on login so the
 * token is not accessible to JS (XSS-safe). See docs/SECURITY.md.
 */

/** Base URL for API requests. In dev returns "" (relative) so Vite proxy is used; in prod returns VITE_BACKEND_URL. */
export const getApiBaseUrl = (): string => {
  if (import.meta.env.DEV) return "";
  return (import.meta.env.VITE_BACKEND_URL as string) || "";
};

export const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export async function authFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const headers = {
    ...(init?.headers || {}),
    ...getAuthHeaders(),
  } as Record<string, string>;

  const response = await fetch(input, {
    ...init,
    headers,
    credentials: "include",
  });

  if (response.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("username");
    if (window.location.pathname !== "/login") {
      window.location.assign("/login");
    }
  }

  return response;
}
