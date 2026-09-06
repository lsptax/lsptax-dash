import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

export function useListSearchParams<T extends Record<string, unknown>>(
  parse: (searchParams: URLSearchParams) => T,
  merge: (current: URLSearchParams, updates: Partial<T>) => URLSearchParams
) {
  const [searchParams, setSearchParams] = useSearchParams();
  const params = useMemo(
    () => parse(searchParams),
    [parse, searchParams]
  );

  const updateParams = useCallback(
    (updates: Partial<T>) => {
      setSearchParams(merge(searchParams, updates), { replace: true });
    },
    [merge, searchParams, setSearchParams]
  );

  return { params, updateParams, searchParams };
}

export function useDraftSearch(
  appliedSearch: string,
  onCommit: (search: string) => void
) {
  const [searchTerm, setSearchTerm] = useState(appliedSearch);

  useEffect(() => {
    setSearchTerm(appliedSearch);
  }, [appliedSearch]);

  const commitSearch = useCallback(() => {
    onCommit(searchTerm.trim());
  }, [onCommit, searchTerm]);

  const clearSearch = useCallback(() => {
    setSearchTerm("");
    onCommit("");
  }, [onCommit]);

  return { searchTerm, setSearchTerm, commitSearch, clearSearch };
}
