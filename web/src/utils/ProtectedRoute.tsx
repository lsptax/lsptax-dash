import { Navigate } from "react-router-dom";

function isJwtExpired(token: string): boolean {
  // If token isn't a JWT, treat it as invalid/expired.
  const parts = token.split(".");
  if (parts.length !== 3) return true;

  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))) as {
      exp?: number;
    };
    if (!payload?.exp) return false; // no exp claim; can't validate expiry
    const nowSeconds = Math.floor(Date.now() / 1000);
    return payload.exp <= nowSeconds;
  } catch {
    return true;
  }
}

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const token = localStorage.getItem("token"); // Check if the user is logged in

  if (!token || isJwtExpired(token)) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("username");
    // If no token, redirect to the login page
    return <Navigate to="/login" replace />;
  }

  // If logged in, render the child component
  return children;
};

export default ProtectedRoute;
