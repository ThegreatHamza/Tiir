export type ThemeMode = "light" | "dark" | "system";
export const THEME_STORAGE_KEY = "tiir.theme";

export function resolveTheme(mode: ThemeMode, prefersDark: boolean): "light" | "dark" {
  if (mode === "system") return prefersDark ? "dark" : "light";
  return mode;
}

export function storedTheme(): ThemeMode {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* storage unavailable */
  }
  return "light";
}

export function applyTheme(mode: ThemeMode): "light" | "dark" {
  const prefersDark = typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const resolved = resolveTheme(mode, Boolean(prefersDark));
  document.documentElement.classList.toggle("dark", resolved === "dark");
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    /* storage unavailable */
  }
  return resolved;
}
