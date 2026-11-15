import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";
import animate from "tailwindcss-animate";

/**
 * Tiir theme — the ONLY place brand colours are defined.
 * Sampled from the Tiir logo (public/brand/tiir-logo-original.png):
 *   navy  #0B2845 (wordmark "T", "r", tile background)
 *   amber #F3A00B (the two pillars)
 * Everything else (shadcn tokens, light/dark) is derived from these two.
 */
export const brand = {
  navy: "#0B2845",
  amber: "#F3A00B",
} as const;

function hexToHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
}

const [nh, ns, nl] = hexToHsl(brand.navy);
const [ah, as, al] = hexToHsl(brand.amber);
const hsl = (h: number, s: number, l: number) => `${h} ${s}% ${l}%`;

const light = {
  "--background": hsl(nh, 20, 98),
  "--foreground": hsl(nh, ns, 12),
  "--card": hsl(0, 0, 100),
  "--card-foreground": hsl(nh, ns, 12),
  "--popover": hsl(0, 0, 100),
  "--popover-foreground": hsl(nh, ns, 12),
  "--primary": hsl(nh, ns, nl),
  "--primary-foreground": hsl(0, 0, 100),
  "--accent": hsl(ah, as, al),
  "--accent-foreground": hsl(nh, ns, nl),
  "--secondary": hsl(nh, 20, 94),
  "--secondary-foreground": hsl(nh, ns, nl),
  "--muted": hsl(nh, 20, 95),
  "--muted-foreground": hsl(nh, 12, 40),
  "--destructive": "0 72% 45%",
  "--destructive-foreground": "0 0% 100%",
  "--success": "152 60% 32%",
  "--warning": hsl(ah, as, 40),
  "--border": hsl(nh, 18, 87),
  "--input": hsl(nh, 18, 82),
  "--ring": hsl(ah, as, al),
  "--sidebar": hsl(nh, ns, nl),
  "--sidebar-foreground": hsl(nh, 20, 92),
  "--sidebar-active": hsl(ah, as, al),
  "--radius": "0.5rem",
};

const dark = {
  "--background": hsl(nh, ns, 7),
  "--foreground": hsl(nh, 15, 92),
  "--card": hsl(nh, ns, 10),
  "--card-foreground": hsl(nh, 15, 92),
  "--popover": hsl(nh, ns, 10),
  "--popover-foreground": hsl(nh, 15, 92),
  "--primary": hsl(ah, as, al),
  "--primary-foreground": hsl(nh, ns, nl),
  "--accent": hsl(ah, as, al),
  "--accent-foreground": hsl(nh, ns, nl),
  "--secondary": hsl(nh, 35, 16),
  "--secondary-foreground": hsl(nh, 15, 92),
  "--muted": hsl(nh, 35, 15),
  "--muted-foreground": hsl(nh, 12, 65),
  "--destructive": "0 65% 55%",
  "--destructive-foreground": "0 0% 100%",
  "--success": "152 50% 45%",
  "--warning": hsl(ah, as, al),
  "--border": hsl(nh, 30, 20),
  "--input": hsl(nh, 30, 24),
  "--ring": hsl(ah, as, al),
  "--sidebar": hsl(nh, ns, 5),
  "--sidebar-foreground": hsl(nh, 15, 85),
  "--sidebar-active": hsl(ah, as, al),
};

const token = (name: string) => `hsl(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1rem" },
    extend: {
      colors: {
        brand: { navy: brand.navy, amber: brand.amber },
        background: token("background"),
        foreground: token("foreground"),
        card: { DEFAULT: token("card"), foreground: token("card-foreground") },
        popover: { DEFAULT: token("popover"), foreground: token("popover-foreground") },
        primary: { DEFAULT: token("primary"), foreground: token("primary-foreground") },
        secondary: { DEFAULT: token("secondary"), foreground: token("secondary-foreground") },
        muted: { DEFAULT: token("muted"), foreground: token("muted-foreground") },
        accent: { DEFAULT: token("accent"), foreground: token("accent-foreground") },
        destructive: { DEFAULT: token("destructive"), foreground: token("destructive-foreground") },
        success: token("success"),
        warning: token("warning"),
        border: token("border"),
        input: token("input"),
        ring: token("ring"),
        sidebar: {
          DEFAULT: token("sidebar"),
          foreground: token("sidebar-foreground"),
          active: token("sidebar-active"),
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: [
          "Inter",
          "Noto Sans Arabic",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Tahoma",
          "sans-serif",
        ],
      },
      minHeight: { touch: "44px" },
      minWidth: { touch: "44px" },
    },
  },
  plugins: [
    animate,
    plugin(({ addBase }) => {
      addBase({ ":root": light, ".dark": dark });
    }),
  ],
} satisfies Config;
