import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import fr from "./locales/fr.json";
import en from "./locales/en.json";
import ar from "./locales/ar.json";
import so from "./locales/so.json";
import { isRtl, LANGUAGES, type AppLanguage } from "@/lib/format";

export const LANGUAGE_STORAGE_KEY = "tiir.language";

export const resources = {
  fr: { translation: fr },
  en: { translation: en },
  ar: { translation: ar },
  so: { translation: so },
} as const;

function storedLanguage(): AppLanguage {
  try {
    const v = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (v && (LANGUAGES as readonly string[]).includes(v)) return v as AppLanguage;
  } catch {
    /* storage unavailable */
  }
  return "fr";
}

/** Sets <html lang dir> so Arabic gets a fully mirrored layout. */
export function applyDocumentLanguage(lang: AppLanguage): void {
  document.documentElement.lang = lang;
  document.documentElement.dir = isRtl(lang) ? "rtl" : "ltr";
}

export async function setLanguage(lang: AppLanguage): Promise<void> {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch {
    /* storage unavailable */
  }
  applyDocumentLanguage(lang);
  if (i18n.language !== lang) await i18n.changeLanguage(lang);
}

const initial = storedLanguage();
void i18n.use(initReactI18next).init({
  resources,
  lng: initial,
  fallbackLng: "fr",
  supportedLngs: [...LANGUAGES],
  interpolation: { escapeValue: false },
  returnNull: false,
});
applyDocumentLanguage(initial);

export function currentLanguage(): AppLanguage {
  const l = i18n.language;
  return (LANGUAGES as readonly string[]).includes(l) ? (l as AppLanguage) : "fr";
}

export default i18n;
