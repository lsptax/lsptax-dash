import { Outlet } from "react-router-dom";

/** Layout shell for `/portal/clients/*` (list, add, move-from-prospect). */
export function ClientSectionLayout() {
  return <Outlet />;
}

/** Layout shell for `/portal/prospect/*` (detail, contract, property, …). */
export function ProspectSectionLayout() {
  return <Outlet />;
}
