import { authFetch, getApiBaseUrl } from "@/api/client";

export type ReportCountiesResponse = {
  counties: string[];
};

export async function getReportCounties(): Promise<string[]> {
  const base = getApiBaseUrl();
  const res = await authFetch(`${base}/report/counties`);
  if (!res.ok) throw new Error(`Failed to load counties (${res.status})`);
  const data = (await res.json()) as ReportCountiesResponse;
  return Array.isArray(data.counties) ? data.counties : [];
}

function getFilenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;
  const match = /filename\*?=(?:UTF-8''|")?([^\";]+)"?/i.exec(header);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export async function downloadPropertiesReportCsv(counties: string[]): Promise<void> {
  const base = getApiBaseUrl();
  const url = new URL(`${base}/report/properties`, window.location.origin);

  const normalized = counties.length ? counties : ["All"];
  for (const c of normalized) url.searchParams.append("county", c);

  const res = await authFetch(url.toString(), {
    method: "GET",
    headers: {
      Accept: "text/csv",
    },
  });

  if (!res.ok) throw new Error(`Failed to download report (${res.status})`);

  const blob = await res.blob();
  const filename =
    getFilenameFromContentDisposition(res.headers.get("content-disposition")) ||
    "properties-report.csv";

  const objectUrl = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

