import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { useIsRestoring } from "@tanstack/react-query";
import { LoadingScreen } from "@/components/common/States";
import { startSync } from "@/lib/offline/sync";
import { useTranslation } from "react-i18next";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { CompanyProvider } from "@/features/companies/CompanyProvider";
import { Toaster } from "@/components/ui/sonner";
import { isRtl, type AppLanguage } from "@/lib/format";
import { PreferencesSync } from "./PreferencesSync";

/** Providers that need the router (navigation) live here. */
export function Root() {
  const { i18n } = useTranslation();
  useEffect(() => startSync(), []);
  // While the offline cache is read back from IndexedDB, queries report "not
  // loading" with no data; guards would wrongly redirect (e.g. to onboarding).
  const restoring = useIsRestoring();
  const dark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  return (
    <AuthProvider>
      <CompanyProvider>
        <PreferencesSync />
        {restoring ? <LoadingScreen /> : <Outlet />}
        <Toaster dir={isRtl(i18n.language as AppLanguage) ? "rtl" : "ltr"} theme={dark ? "dark" : "light"} />
      </CompanyProvider>
    </AuthProvider>
  );
}
