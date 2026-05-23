import "@tanstack/react-query";

declare module "@tanstack/react-query" {
  interface Register {
    queryMeta: {
      /** When true, global QueryCache onError skips toast (page shows its own UI). */
      suppressGlobalErrorToast?: boolean;
    };
    mutationMeta: Record<string, unknown>;
  }
}
