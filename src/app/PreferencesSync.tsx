import { useEffect } from "react";
import { useCompanyContext } from "@/features/companies/CompanyProvider";
import { setLanguage } from "@/i18n";
import { applyTheme } from "@/lib/theme";

/**
 * Applies the signed-in user's language (or the company default) and theme.
 * Language precedence: user choice → company default → French.
 */
export function PreferencesSync() {
  const { profile, company } = useCompanyContext();
  const lang = profile?.language ?? company?.default_language ?? null;
  const theme = profile?.theme ?? null;

  useEffect(() => {
    if (lang) void setLanguage(lang);
  }, [lang]);

  useEffect(() => {
    if (theme) applyTheme(theme);
  }, [theme]);

  return null;
}
