/**
 * PDF documents (loaded on demand: @react-pdf/renderer is large).
 * Every document carries the company header and the Tiir logo, used unchanged.
 * Standard PDF fonts are used (no download, works offline); they cannot shape
 * Arabic, so Arabic users get documents in French (see DECISIONS.md).
 */
import { Document, Image, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import type { TFunction } from "i18next";
import tiirLogo from "@/assets/tiir-logo.png";
import { brand } from "@/theme/brand";
import { formatDate, formatMoney, formatNumber, type AppLanguage } from "@/lib/format";
import type { CurrencyCode } from "@/lib/calc/money";
import type { BoqDocument } from "./boqModel";
import type { UpaDoc } from "./upaModel";

export type PdfCompany = {
  name: string;
  legal_name: string | null;
  address: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  tax_id: string | null;
  logoUrl: string | null;
  timezone: string;
};

export type PdfContext = {
  t: TFunction;
  lang: AppLanguage;
  company: PdfCompany;
  title: string;
  subtitle: string;
  meta: [string, string][];
  currency: CurrencyCode;
};

/**
 * The standard PDF fonts lack some characters: replace the narrow/no-break
 * spaces used by Intl, the minus sign, and superscript ² ³ (m² → m2).
 */
export const pdfText = (s: string) => s.replace(/[   ]/g, " ").replace(/−/g, "-").replace(/²/g, "2").replace(/³/g, "3");

const s = StyleSheet.create({
  page: { paddingTop: 28, paddingBottom: 44, paddingHorizontal: 32, fontSize: 8.5, fontFamily: "Helvetica", color: "#111827" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: brand.navy,
    paddingBottom: 8,
    marginBottom: 10,
  },
  companyBlock: { flexDirection: "row", gap: 8, maxWidth: "70%" },
  companyName: { fontSize: 12, fontFamily: "Helvetica-Bold", color: brand.navy },
  small: { fontSize: 7.5, color: "#4b5563" },
  title: { fontSize: 14, fontFamily: "Helvetica-Bold", color: brand.navy, marginBottom: 2 },
  subtitle: { fontSize: 9, color: "#374151", marginBottom: 6 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 10 },
  th: { flexDirection: "row", backgroundColor: brand.navy, color: "#ffffff", fontFamily: "Helvetica-Bold", fontSize: 7.5 },
  tr: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#d1d5db" },
  section: {
    flexDirection: "row",
    backgroundColor: "#eef1f5",
    fontFamily: "Helvetica-Bold",
    borderBottomWidth: 0.5,
    borderBottomColor: "#9ca3af",
  },
  subtotal: { flexDirection: "row", fontFamily: "Helvetica-Bold", borderTopWidth: 1, borderTopColor: brand.navy, marginBottom: 6 },
  cell: { paddingVertical: 3, paddingHorizontal: 4 },
  right: { textAlign: "right" },
  totals: { marginTop: 8, marginLeft: "auto", width: "45%" },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
    paddingHorizontal: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#d1d5db",
  },
  grand: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    paddingHorizontal: 4,
    backgroundColor: brand.amber,
    fontFamily: "Helvetica-Bold",
  },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 32,
    right: 32,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: "#6b7280",
    borderTopWidth: 0.5,
    borderTopColor: "#d1d5db",
    paddingTop: 4,
  },
  blank: { borderBottomWidth: 0.5, borderBottomColor: "#9ca3af", height: 10, marginHorizontal: 4 },
  upa: { marginBottom: 12 },
  upaHead: { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#eef1f5", padding: 4, fontFamily: "Helvetica-Bold" },
});

function Header({ ctx }: { ctx: PdfContext }) {
  const c = ctx.company;
  const lines = [
    c.legal_name && c.legal_name !== c.name ? c.legal_name : null,
    [c.address, c.city].filter(Boolean).join(", ") || null,
    [c.phone, c.email].filter(Boolean).join(" · ") || null,
    c.tax_id ? `${ctx.t("common.taxId")} : ${c.tax_id}` : null,
  ].filter((x): x is string => Boolean(x));
  return (
    <View style={s.header} fixed>
      <View style={s.companyBlock}>
        {c.logoUrl ? <Image src={c.logoUrl} style={{ height: 40, maxWidth: 90, objectFit: "contain" }} /> : null}
        <View>
          <Text style={s.companyName}>{pdfText(c.name)}</Text>
          {lines.map((l) => (
            <Text key={l} style={s.small}>
              {pdfText(l)}
            </Text>
          ))}
        </View>
      </View>
      <Image src={tiirLogo} style={{ height: 22, width: 70, objectFit: "contain" }} />
    </View>
  );
}

function Footer({ ctx }: { ctx: PdfContext }) {
  return (
    <View style={s.footer} fixed>
      <Text>{pdfText(`${ctx.title} — ${ctx.subtitle}`)}</Text>
      <Text>{pdfText(formatDate(new Date(), ctx.company.timezone))}</Text>
      <Text render={({ pageNumber, totalPages }) => pdfText(ctx.t("pdf.page", { page: pageNumber, pages: totalPages }))} />
    </View>
  );
}

function TitleBlock({ ctx }: { ctx: PdfContext }) {
  return (
    <View>
      <Text style={s.title}>{pdfText(ctx.title)}</Text>
      <Text style={s.subtitle}>{pdfText(ctx.subtitle)}</Text>
      <View style={s.metaRow}>
        {ctx.meta.map(([k, v]) => (
          <Text key={k}>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>{pdfText(k)} : </Text>
            {pdfText(v)}
          </Text>
        ))}
      </View>
    </View>
  );
}

const W = { code: "9%", desc: "45%", unit: "7%", qty: "10%", price: "13%", total: "16%" };

export function BoqPdf({ ctx, doc }: { ctx: PdfContext; doc: BoqDocument }) {
  const { t, lang, currency } = ctx;
  const m = (v: number | null) => pdfText(formatMoney(v, currency, lang));
  const unit = (u: string) => pdfText(t(`units.${u}`));
  return (
    <Document title={`${ctx.title} — ${ctx.subtitle}`} author={ctx.company.name} creator="Tiir" producer="Tiir">
      <Page size="A4" style={s.page}>
        <Header ctx={ctx} />
        <TitleBlock ctx={ctx} />
        <View style={s.th} fixed>
          <Text style={[s.cell, { width: W.code }]}>{pdfText(t("pdf.no"))}</Text>
          <Text style={[s.cell, { width: W.desc }]}>{pdfText(t("estimating.designation"))}</Text>
          <Text style={[s.cell, { width: W.unit }]}>{pdfText(t("estimating.unitShort"))}</Text>
          <Text style={[s.cell, s.right, { width: W.qty }]}>{pdfText(t("estimating.quantity"))}</Text>
          <Text style={[s.cell, s.right, { width: W.price }]}>{pdfText(t("estimating.unitPriceShort", { currency }))}</Text>
          <Text style={[s.cell, s.right, { width: W.total }]}>{pdfText(t("estimating.amount", { currency }))}</Text>
        </View>
        {doc.sections.map((sec, si) => (
          <View key={si}>
            <View style={s.section} wrap={false}>
              <Text style={[s.cell, { width: W.code }]}>{pdfText(sec.code)}</Text>
              <Text style={[s.cell, { width: "91%" }]}>{pdfText(sec.title)}</Text>
            </View>
            {sec.items.map((it, ii) => (
              <View key={ii} style={s.tr} wrap={false}>
                <Text style={[s.cell, { width: W.code }]}>{pdfText(it.code)}</Text>
                <Text style={[s.cell, { width: W.desc }]}>{pdfText(it.description)}</Text>
                <Text style={[s.cell, { width: W.unit }]}>{unit(it.unit)}</Text>
                <Text style={[s.cell, s.right, { width: W.qty }]}>{pdfText(formatNumber(it.quantity, lang, 3))}</Text>
                {doc.priced ? (
                  <>
                    <Text style={[s.cell, s.right, { width: W.price }]}>{m(it.unitPrice)}</Text>
                    <Text style={[s.cell, s.right, { width: W.total }]}>{m(it.total)}</Text>
                  </>
                ) : (
                  <>
                    <View style={{ width: W.price, justifyContent: "flex-end" }}>
                      <View style={s.blank} />
                    </View>
                    <View style={{ width: W.total, justifyContent: "flex-end" }}>
                      <View style={s.blank} />
                    </View>
                  </>
                )}
              </View>
            ))}
            <View style={s.subtotal} wrap={false}>
              <Text style={[s.cell, { width: "84%" }]}>{pdfText(t("pdf.subtotal", { code: sec.code, title: sec.title }))}</Text>
              {doc.priced ? (
                <Text style={[s.cell, s.right, { width: W.total }]}>{m(sec.subtotal)}</Text>
              ) : (
                <View style={{ width: W.total, justifyContent: "flex-end" }}>
                  <View style={s.blank} />
                </View>
              )}
            </View>
          </View>
        ))}
        <View style={s.totals} wrap={false}>
          {(
            [
              [t("pdf.totalHt"), doc.totalHt, false],
              [t("pdf.vat", { rate: pdfText(formatNumber(doc.vatRate, lang, 3)) }), doc.vat, false],
              [t("pdf.totalTtc"), doc.totalTtc, true],
            ] as const
          ).map(([label, value, grand]) => (
            <View key={label} style={grand ? s.grand : s.totalRow}>
              <Text>{pdfText(label)}</Text>
              {doc.priced ? <Text>{m(value)}</Text> : <View style={[s.blank, { width: 90 }]} />}
            </View>
          ))}
        </View>
        {!doc.priced ? <Text style={[s.small, { marginTop: 14 }]}>{pdfText(t("pdf.tenderNote"))}</Text> : null}
        <Footer ctx={ctx} />
      </Page>
    </Document>
  );
}

const UW = { desc: "40%", unit: "8%", qty: "12%", price: "14%", waste: "10%", amount: "16%" };

export function UpaPdf({ ctx, docs }: { ctx: PdfContext; docs: UpaDoc[] }) {
  const { t, lang, currency } = ctx;
  const m = (v: number | null) => pdfText(formatMoney(v, currency, lang));
  return (
    <Document title={`${ctx.title} — ${ctx.subtitle}`} author={ctx.company.name} creator="Tiir" producer="Tiir">
      <Page size="A4" style={s.page}>
        <Header ctx={ctx} />
        <TitleBlock ctx={ctx} />
        {docs.length === 0 ? <Text>{pdfText(t("estimating.upa.empty"))}</Text> : null}
        {docs.map((d) => (
          <View key={d.code} style={s.upa} wrap={false}>
            <View style={s.upaHead}>
              <Text>{pdfText(`${d.code} — ${d.title}`)}</Text>
              <Text>{pdfText(t("pdf.perUnit", { unit: t(`units.${d.unit}`) }))}</Text>
            </View>
            <View style={s.th}>
              <Text style={[s.cell, { width: UW.desc }]}>{pdfText(t("estimating.designation"))}</Text>
              <Text style={[s.cell, { width: UW.unit }]}>{pdfText(t("estimating.unitShort"))}</Text>
              <Text style={[s.cell, s.right, { width: UW.qty }]}>{pdfText(t("estimating.upa.consumption"))}</Text>
              <Text style={[s.cell, s.right, { width: UW.price }]}>{pdfText(t("estimating.unitCost"))}</Text>
              <Text style={[s.cell, s.right, { width: UW.waste }]}>{pdfText(t("estimating.upa.waste"))}</Text>
              <Text style={[s.cell, s.right, { width: UW.amount }]}>{pdfText(t("estimating.upa.amount"))}</Text>
            </View>
            {d.groups.map((g) => (
              <View key={g.kind}>
                <View style={s.section}>
                  <Text style={[s.cell, { width: "84%" }]}>{pdfText(t(`estimating.kinds.${g.kind}`))}</Text>
                  <Text style={[s.cell, s.right, { width: UW.amount }]}>{m(g.subtotal)}</Text>
                </View>
                {g.lines.map((l, i) => (
                  <View key={i} style={s.tr}>
                    <Text style={[s.cell, { width: UW.desc }]}>{pdfText(l.designation)}</Text>
                    <Text style={[s.cell, { width: UW.unit }]}>{pdfText(t(`units.${l.unit}`))}</Text>
                    <Text style={[s.cell, s.right, { width: UW.qty }]}>{pdfText(formatNumber(l.quantity, lang, 4))}</Text>
                    <Text style={[s.cell, s.right, { width: UW.price }]}>{m(l.unitCost)}</Text>
                    <Text style={[s.cell, s.right, { width: UW.waste }]}>{pdfText(`${formatNumber(l.waste, lang, 3)} %`)}</Text>
                    <Text style={[s.cell, s.right, { width: UW.amount }]}>{m(l.amount)}</Text>
                  </View>
                ))}
              </View>
            ))}
            <View style={s.totalRow}>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>{pdfText(t("estimating.upa.dryCost"))}</Text>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>{m(d.dryCost)}</Text>
            </View>
            <View style={s.totalRow}>
              <Text>{pdfText(t("estimating.upa.coefficient"))}</Text>
              <Text>{pdfText(`× ${formatNumber(d.coefficient, lang, 4)}`)}</Text>
            </View>
            <View style={s.grand}>
              <Text>{pdfText(t("estimating.upa.sellingPrice", { unit: t(`units.${d.unit}`) }))}</Text>
              <Text>{m(d.sellingPrice)}</Text>
            </View>
          </View>
        ))}
        <Footer ctx={ctx} />
      </Page>
    </Document>
  );
}

export async function downloadPdf(element: React.ReactElement, fileName: string): Promise<void> {
  // react-pdf's pdf() expects a <Document> element.
  const blob = await pdf(element as Parameters<typeof pdf>[0]).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
