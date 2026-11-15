import type { TFunction } from "i18next";
import i18n from "@/i18n";
import type { Tables } from "@/lib/supabase";
import { signedUrl } from "@/lib/supabase";
import { formatDate, type AppLanguage } from "@/lib/format";
import { safeFileName } from "@/lib/export/excel";
import type { CurrencyCode } from "@/lib/calc/money";
import type { PdfContext } from "./common";
import type { PdfBlock } from "./table";

/** PDFs use standard fonts that cannot shape Arabic: Arabic users get French documents. */
export function pdfLanguage(lang: AppLanguage): AppLanguage {
  return lang === "ar" ? "fr" : lang;
}

export async function makePdfContext(opts: {
  company: Tables<"companies">;
  lang: AppLanguage;
  title: (t: TFunction) => string;
  subtitle: string;
  meta?: (t: TFunction) => [string, string][];
  currency: CurrencyCode;
}): Promise<PdfContext> {
  const lang = pdfLanguage(opts.lang);
  const t = i18n.getFixedT(lang);
  const c = opts.company;
  return {
    t,
    lang,
    title: opts.title(t),
    subtitle: opts.subtitle,
    meta: [...(opts.meta?.(t) ?? []), [t("estimating.exports.date"), formatDate(new Date(), c.timezone)]],
    currency: opts.currency,
    company: {
      name: c.name,
      legal_name: c.legal_name,
      address: c.address,
      city: c.city,
      phone: c.phone,
      email: c.email,
      tax_id: c.tax_id,
      logoUrl: c.logo_path ? await signedUrl(c.logo_path, 600) : null,
      timezone: c.timezone,
    },
  };
}

/** Builds and downloads a tabular PDF. react-pdf is loaded only now. */
export async function exportTablePdf(
  ctx: PdfContext,
  blocks: PdfBlock[],
  opts: { fileName: string; landscape?: boolean; note?: string; signatures?: string[] },
): Promise<void> {
  const [{ TablePdf }, { downloadPdf }] = await Promise.all([import("./table"), import("./common")]);
  const { createElement } = await import("react");
  await downloadPdf(
    createElement(TablePdf, { ctx, blocks, landscape: opts.landscape, note: opts.note, signatures: opts.signatures }),
    `${safeFileName(opts.fileName)}.pdf`,
  );
}
