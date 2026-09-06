import { NavLink, useLocation } from "react-router-dom";
import { withReturnTo } from "@/routes/ROUTES";

type ListDetailLinkProps = {
  to: string;
  children: React.ReactNode;
  className?: string;
  target?: string;
  rel?: string;
};

export function ListDetailLink({
  to,
  children,
  className,
  target,
  rel,
}: ListDetailLinkProps) {
  const location = useLocation();
  const returnTo = `${location.pathname}${location.search}`;

  return (
    <NavLink
      to={withReturnTo(to, returnTo)}
      className={className}
      target={target}
      rel={rel}
    >
      {children}
    </NavLink>
  );
}
