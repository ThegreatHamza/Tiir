import { useTranslation } from "react-i18next";
import { Logo } from "@/components/common/Logo";

/** Shown when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set. */
export function ConfigMissing() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto grid max-w-lg gap-4 p-6">
      <Logo plate />
      <h1 className="text-lg font-semibold">{t("errors.configMissing")}</h1>
      <p className="text-sm text-muted-foreground">{t("errors.configMissingHint")}</p>
      <pre className="rounded-md bg-muted p-3 text-xs ltr-nums" dir="ltr">
        VITE_SUPABASE_URL=…{"\n"}VITE_SUPABASE_ANON_KEY=…
      </pre>
    </div>
  );
}
