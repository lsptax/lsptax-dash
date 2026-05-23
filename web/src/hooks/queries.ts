import { useQuery, useQueries } from "@tanstack/react-query";
import {
  getClients,
  getArchiveClients,
  getProperties,
  getArchiveProperties,
  getProspects,
  getArchiveProspects,
  getAllInvoices,
  getArchiveInvoices,
  dashboardData,
  getHearings,
} from "@/store/data";
import { DEFAULT_PAGE_SIZE } from "@/store/common";
import { QUERY_META_SUPPRESS_GLOBAL_ERROR_TOAST } from "@/routes/ROUTES";

const queryClientDefaults = {
  staleTime: 60 * 1000,
  retry: 1,
};

export function useClientsQuery({
  limit = DEFAULT_PAGE_SIZE,
  offset = 0,
  search = "",
  archived = false,
  accountType,
}: {
  limit?: number;
  offset?: number;
  search?: string;
  archived?: boolean;
  accountType?: string;
}) {
  return useQuery({
    queryKey: ["clients", limit, offset, search, archived, accountType || ""],
    queryFn: () =>
      archived
        ? getArchiveClients(limit, offset, search || undefined, accountType || undefined)
        : getClients(limit, offset, search || undefined, accountType || undefined),
    ...queryClientDefaults,
  });
}

export function usePropertiesQuery({
  limit = DEFAULT_PAGE_SIZE,
  offset = 0,
  search = "",
  archived = false,
  accountType,
}: {
  limit?: number;
  offset?: number;
  search?: string;
  archived?: boolean;
  accountType?: string;
}) {
  return useQuery({
    queryKey: ["properties", limit, offset, search, archived, accountType || ""],
    queryFn: () =>
      archived
        ? getArchiveProperties(limit, offset, search || undefined, accountType || undefined)
        : getProperties(limit, offset, search || undefined, accountType || undefined),
    ...queryClientDefaults,
  });
}

export function useProspectsQuery({
  limit = DEFAULT_PAGE_SIZE,
  offset = 0,
  archived = false,
}: {
  limit?: number;
  offset?: number;
  archived?: boolean;
}) {
  return useQuery({
    queryKey: ["prospects", limit, offset, archived],
    queryFn: () =>
      archived
        ? getArchiveProspects(limit, offset)
        : getProspects(limit, offset),
    ...queryClientDefaults,
  });
}

export function useInvoicesQuery({
  limit = DEFAULT_PAGE_SIZE,
  offset = 0,
  search = "",
  archived = false,
}: {
  limit?: number;
  offset?: number;
  search?: string;
  archived?: boolean;
}) {
  return useQuery({
    queryKey: ["invoices", limit, offset, search, archived],
    queryFn: () =>
      archived
        ? getArchiveInvoices(limit, offset, search || undefined)
        : getAllInvoices(limit, offset, search || undefined),
    ...queryClientDefaults,
  });
}

export function useHearingsQuery({
  limit = DEFAULT_PAGE_SIZE,
  offset = 0,
  from,
  to,
  status,
}: {
  limit?: number;
  offset?: number;
  from?: string;
  to?: string;
  status?: string;
}) {
  return useQuery({
    queryKey: ["hearings", limit, offset, from ?? "", to ?? "", status ?? ""],
    queryFn: () => getHearings(limit, offset, from, to, status),
    ...queryClientDefaults,
  });
}

export function useDashboardQuery() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: dashboardData,
    meta: QUERY_META_SUPPRESS_GLOBAL_ERROR_TOAST,
    ...queryClientDefaults,
  });
}

/** For dashboard page: stats + 3 list slices in parallel */
export function useDashboardDataQuery() {
  const dashboardStats = useDashboardQuery();

  const [propertiesRes, clientsRes, prospectsRes] = useQueries({
    queries: [
      {
        queryKey: ["properties", 10, 0, "", false],
        queryFn: () => getProperties(10, 0),
        meta: QUERY_META_SUPPRESS_GLOBAL_ERROR_TOAST,
        ...queryClientDefaults,
      },
      {
        queryKey: ["clients", 10, 0, "", false],
        queryFn: () => getClients(10, 0),
        meta: QUERY_META_SUPPRESS_GLOBAL_ERROR_TOAST,
        ...queryClientDefaults,
      },
      {
        queryKey: ["prospects", 10, 0, false],
        queryFn: () => getProspects(10, 0),
        meta: QUERY_META_SUPPRESS_GLOBAL_ERROR_TOAST,
        ...queryClientDefaults,
      },
    ],
  });

  const isLoading =
    dashboardStats.isLoading ||
    propertiesRes.isLoading ||
    clientsRes.isLoading ||
    prospectsRes.isLoading;
  const isError =
    dashboardStats.isError ||
    propertiesRes.isError ||
    clientsRes.isError ||
    prospectsRes.isError;
  const error =
    dashboardStats.error ||
    propertiesRes.error ||
    clientsRes.error ||
    prospectsRes.error;
  const refetch = () => {
    dashboardStats.refetch();
    propertiesRes.refetch();
    clientsRes.refetch();
    prospectsRes.refetch();
  };

  return {
    stats: dashboardStats.data ?? { numOfClients: 0, numOfProspects: 0, numOfAgents: 0 },
    propData: (propertiesRes.data?.data ?? []) as unknown[],
    clientData: (clientsRes.data?.data ?? []) as unknown[],
    prospectData: (prospectsRes.data?.data ?? []) as unknown[],
    isLoading,
    isError,
    error,
    refetch,
  };
}
