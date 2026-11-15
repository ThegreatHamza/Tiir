import * as React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ShieldOff } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { useCompanyContext } from "@/features/companies/CompanyProvider";
import { ErrorState, EmptyState, LoadingScreen } from "@/components/common/States";
import { errorMessage } from "@/lib/errors";
import type { AppRole } from "@/lib/roles";

export function RequireAuth() {
  const { session, loading, recovery } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingScreen />;
  if (recovery) return <Navigate to="/reset-password" replace />;
  if (!session) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return <Outlet />;
}

export function RedirectIfAuthed({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingScreen />;
  if (session) {
    const next = new URLSearchParams(location.search).get("next");
    return <Navigate to={next && next.startsWith("/") && !next.startsWith("//") ? next : "/"} replace />;
  }
  return <>{children}</>;
}

export function RequireCompany() {
  const { t } = useTranslation();
  const { loading, error, current, refetch } = useCompanyContext();
  if (loading) return <LoadingScreen />;
  if (error)
    return (
      <div className="p-6">
        <ErrorState message={errorMessage(t, error)} onRetry={refetch} />
      </div>
    );
  if (!current) return <Navigate to="/onboarding" replace />;
  return <Outlet />;
}

export function RequireRole({ roles, children }: { roles: readonly AppRole[]; children: React.ReactNode }) {
  const { t } = useTranslation();
  const { role } = useCompanyContext();
  if (!role || !roles.includes(role)) {
    return (
      <EmptyState
        icon={<ShieldOff className="size-8" aria-hidden />}
        title={t("errors.forbidden")}
        description={t("errors.forbiddenHint")}
      />
    );
  }
  return <>{children}</>;
}
