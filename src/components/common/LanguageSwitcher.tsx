import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LANGUAGES, type AppLanguage } from "@/lib/format";
import { currentLanguage, setLanguage } from "@/i18n";

/** Language names are written in their own language, so they are the same in every locale file. */
export function LanguageSwitcher({ onChange, compact }: { onChange?: (lang: AppLanguage) => void; compact?: boolean }) {
  const { t } = useTranslation();
  const lang = currentLanguage();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size={compact ? "icon" : "sm"} aria-label={t("common.language")}>
          <Languages />
          {compact ? null : <span>{t(`languages.${lang}`)}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LANGUAGES.map((l) => (
          <DropdownMenuItem
            key={l}
            onSelect={() => {
              void setLanguage(l);
              onChange?.(l);
            }}
            aria-current={l === lang ? "true" : undefined}
            className={l === lang ? "font-semibold" : undefined}
            lang={l}
          >
            {t(`languages.${l}`)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
