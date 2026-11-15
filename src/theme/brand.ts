/**
 * Tiir brand colours — the ONLY place they are defined.
 * Sampled from the Tiir logo (public/brand/tiir-logo-original.png):
 *   navy  #0B2845 (wordmark "T", "r", tile background)
 *   amber #F3A00B (the two pillars)
 * tailwind.config.ts derives every theme token from these, and the PDF
 * exports use them directly.
 */
export const brand = {
  navy: "#0B2845",
  amber: "#F3A00B",
} as const;
