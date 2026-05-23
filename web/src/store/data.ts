/**
 * Public store barrel: re-exports all data modules so existing
 * imports from @/store/data continue to work.
 */
export type { PaginatedResponse } from "./common";
export { DEFAULT_PAGE_SIZE, getFormattedDate, emptyPaginated } from "./common";
export * from "./clients";
export * from "./properties";
export * from "./invoices";
export * from "./prospects";
export * from "./dashboard";
export * from "./hearings";
