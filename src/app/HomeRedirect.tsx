import { Navigate } from "react-router-dom";
import { useCurrentCompany } from "@/features/companies/CompanyProvider";
import { can } from "@/lib/roles";

/** Landing screen by role: clients → portal, cost roles → dashboard, site staff → projects. */
export function HomeRedirect() {
  const { role } = useCurrentCompany();
  if (role === "client_viewer") return <Navigate to="/portal" replace />;
  if (can.seeCosts(role)) return <Navigate to="/dashboard" replace />;
  return <Navigate to="/projects" replace />;
}
