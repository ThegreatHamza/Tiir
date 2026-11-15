import { Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { CompanyProvider } from "@/features/companies/CompanyProvider";
import { Toaster } from "@/components/ui/sonner";
import { isRtl, type AppLanguage } from "@/lib/format";
import { PreferencesSync } from "./PreferencesSync";

/** Providers that need the router (navigation) live here. */
export function Root() {
  const { i18n } = useTranslation();
  const dark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  return (
    <AuthProvider>
      <CompanyProvider>
        <PreferencesSync />
        <Outlet />
        <Toaster dir={isRtl(i18n.language as AppLanguage) ? "rtl" : "ltr"} theme={dark ? "dark" : "light"} />
      </CompanyProvider>
    </AuthProvider>
  );
}
