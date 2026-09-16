import type { ReactNode } from "react";

export function EntityDetailsCard({ children }: { children: ReactNode }) {
  return (
    <div className="mb-8 rounded-xl border border-border bg-card p-4 sm:p-5">
      <table className="table-auto w-full max-w-3xl">
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function EntityDetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <tr>
      <td className="py-1.5 pr-8 text-sm font-medium text-muted-foreground whitespace-nowrap align-top">
        {label}
      </td>
      <td className="py-1.5 text-sm text-foreground">{children}</td>
    </tr>
  );
}
