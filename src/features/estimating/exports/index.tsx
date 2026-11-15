/**
 * Estimate exports: priced BoQ, unpriced BoQ (tender), unit price analyses —
 * each in Excel and PDF. Heavy libraries (SheetJS, react-pdf) load on demand.
 */
import i18n from "@/i18n";
import { exportWorkbook, safeFileName, type SheetSpec } from "@/lib/export/excel";
import { CURRENCY_DECIMALS, type CurrencyCode } from "@/lib/calc/money";
import { formatDate, formatNumber, type AppLanguage } from "@/lib/format";
import { moneyNumFmt } from "@/lib/export/excel";
import type { Tables } from "@/lib/supabase";
import { fetchComponentsForVersion, type BoqItemValue, type BoqSection, type BoqVersion, type UpaValue } from "../api";
import { buildBoqDocument, buildBoqSheet } from "./boqModel";
import { buildUpaDocs } from "./upaModel";
import type { PdfCompany, PdfContext } from "./pdf";

export type ExportKind = "boq-priced" | "boq-unpriced" | "upa";
export type ExportFormat = "xlsx" | "pdf";

export type ExportContext = {
  company: Tables<"companies">;
  companyLogoUrl: string | null;
  project: { code: string; name: string; client_name: string | null; city: string | null };
  version: BoqVersion;
  sections: BoqSection[];
  items: BoqItemValue[];
  upas: UpaValue[];
  currency: CurrencyCode;
  vatRate: number;
  lang: AppLanguage;
};

/** Documents are produced in the user's language; Arabic falls back to French (PDF fonts, see DECISIONS.md). */
export function documentLanguage(lang: AppLanguage, format: ExportFormat): AppLanguage {
  return format === "pdf" && lang === "ar" ? "fr" : lang;
}

export async function runExport(kind: ExportKind, format: ExportFormat, ctx: ExportContext): Promise<void> {
  const lang = documentLanguage(ctx.lang, format);
  const t = i18n.getFixedT(lang);
  const { project, version, currency } = ctx;
  const versionLabel = `V${version.number} — ${version.name}`;
  const docTitle =
    kind === "upa"
      ? t("estimating.exports.upaTitle")
      : kind === "boq-priced"
        ? t("estimating.exports.pricedTitle")
        : t("estimating.exports.unpricedTitle");
  const subtitle = `${project.code} — ${project.name}`;
  const meta: [string, string][] = [
    [t("estimating.exports.version"), versionLabel],
    ...(project.client_name ? ([[t("projects.client"), project.client_name]] as [string, string][]) : []),
    ...(project.city ? ([[t("common.city"), project.city]] as [string, string][]) : []),
    [t("common.currency"), currency],
    [t("estimating.exports.date"), formatDate(new Date(), ctx.company.timezone)],
  ];
  const fileBase = safeFileName(`${project.code}_${docTitle}_V${version.number}`);

  if (kind === "upa") {
    const comps = await fetchComponentsForVersion(version.id);
    const docs = buildUpaDocs(
      ctx.upas.map((u) => ({
        id: u.id,
        code: u.code,
        title: u.title,
        unit: u.unit,
        coefficient: u.effective_coefficient ?? ctx.version.coefficient,
        components: comps.filter((c) => c.upa_id === u.id),
      })),
      currency,
    );
    if (format === "pdf") {
      const { UpaPdf, downloadPdf } = await import("./pdf");
      await downloadPdf(<UpaPdf ctx={pdfContext(ctx, t, lang, docTitle, subtitle, meta)} docs={docs} />, `${fileBase}.pdf`);
      return;
    }
    const fmt = moneyNumFmt(CURRENCY_DECIMALS[currency]);
    const dec = CURRENCY_DECIMALS[currency];
    const sheets: SheetSpec[] = docs.map((d) => {
      const rows: SheetSpec["rows"] = [
        [{ v: `${d.code} — ${d.title}` }],
        [{ v: t("pdf.perUnit", { unit: t(`units.${d.unit}`) }) }],
        [],
        [
          t("estimating.resources.kind"),
          t("estimating.designation"),
          t("estimating.unitShort"),
          t("estimating.upa.consumption"),
          t("estimating.unitCost"),
          t("estimating.upa.waste"),
          t("estimating.upa.amount"),
        ].map((v) => ({ v })),
      ];
      const amountRefs: string[] = [];
      for (const g of d.groups)
        for (const l of g.lines) {
          const r = rows.length + 1;
          amountRefs.push(`G${r}`);
          rows.push([
            { v: t(`estimating.kinds.${g.kind}`) },
            { v: l.designation },
            { v: t(`units.${l.unit}`) },
            { v: l.quantity, z: "0.0000" },
            { v: l.unitCost, z: fmt },
            { v: l.waste / 100, z: "0.0%" },
            { f: `ROUND(D${r}*E${r}*(1+F${r}),${dec})`, v: l.amount, z: fmt },
          ]);
        }
      rows.push([]);
      const dryRow = rows.length + 1;
      rows.push([
        {},
        { v: t("estimating.upa.dryCost") },
        {},
        {},
        {},
        {},
        { f: amountRefs.length ? amountRefs.join("+") : "0", v: d.dryCost, z: fmt },
      ]);
      const kRow = rows.length + 1;
      rows.push([{}, { v: t("estimating.upa.coefficient") }, {}, {}, {}, {}, { v: d.coefficient, z: "0.0000" }]);
      rows.push([
        {},
        { v: t("estimating.upa.sellingPrice", { unit: t(`units.${d.unit}`) }) },
        {},
        {},
        {},
        {},
        { f: `ROUND(G${dryRow}*G${kRow},${dec})`, v: d.sellingPrice, z: fmt },
      ]);
      return { name: d.code, rows, cols: [14, 44, 8, 12, 14, 10, 16] };
    });
    await exportWorkbook(fileBase, sheets.length ? sheets : [{ name: docTitle, rows: [[{ v: t("estimating.upa.empty") }]] }]);
    return;
  }

  const priced = kind === "boq-priced";
  const doc = buildBoqDocument({
    sections: ctx.sections.map((s) => ({ id: s.id, code: s.code, title: s.title, position: s.position })),
    items: ctx.items.map((i) => ({
      id: i.id,
      section_id: i.section_id,
      position: i.position,
      code: i.code,
      description: i.description,
      unit: i.unit,
      quantity: i.effective_quantity ?? 0,
      unitPrice: i.effective_unit_price,
    })),
    currency,
    vatRate: ctx.vatRate,
    priced,
  });

  if (format === "pdf") {
    const { BoqPdf, downloadPdf } = await import("./pdf");
    await downloadPdf(<BoqPdf ctx={pdfContext(ctx, t, lang, docTitle, subtitle, meta)} doc={doc} />, `${fileBase}.pdf`);
    return;
  }
  const sheet = buildBoqSheet(
    doc,
    {
      title: `${ctx.company.name} — ${docTitle}`,
      lines: [subtitle, ...meta.map(([k, v]) => `${k} : ${v}`)],
      headers: [
        t("pdf.no"),
        t("estimating.designation"),
        t("estimating.unitShort"),
        t("estimating.quantity"),
        t("estimating.unitPriceShort", { currency }),
        t("estimating.amount", { currency }),
      ],
      subtotal: (code, title) => t("pdf.subtotal", { code, title }),
      totalHt: t("pdf.totalHt"),
      vat: t("pdf.vat", { rate: formatNumber(ctx.vatRate, lang, 3) }),
      totalTtc: t("pdf.totalTtc"),
      unitLabel: (u) => t(`units.${u}`),
    },
    moneyNumFmt(CURRENCY_DECIMALS[currency]),
    CURRENCY_DECIMALS[currency],
  );
  await exportWorkbook(fileBase, [{ name: docTitle, rows: sheet.rows, cols: sheet.cols }]);
}

function pdfContext(
  ctx: ExportContext,
  t: PdfContext["t"],
  lang: AppLanguage,
  title: string,
  subtitle: string,
  meta: [string, string][],
): PdfContext {
  const c = ctx.company;
  const company: PdfCompany = {
    name: c.name,
    legal_name: c.legal_name,
    address: c.address,
    city: c.city,
    phone: c.phone,
    email: c.email,
    tax_id: c.tax_id,
    logoUrl: ctx.companyLogoUrl,
    timezone: c.timezone,
  };
  return { t, lang, company, title, subtitle, meta, currency: ctx.currency };
}
