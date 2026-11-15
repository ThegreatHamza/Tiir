/**
 * Shared PDF building blocks (loaded on demand: @react-pdf/renderer is large).
 * Every document carries the company header and the Tiir logo, used unchanged.
 * Standard PDF fonts are used (no download, works offline); they cannot shape
 * Arabic, so Arabic users get documents in French (see DECISIONS.md).
 */
import { Image, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import type { TFunction } from "i18next";
import tiirLogo from "@/assets/tiir-logo.png";
import { brand } from "@/theme/brand";
import { formatDate, type AppLanguage } from "@/lib/format";
import type { CurrencyCode } from "@/lib/calc/money";

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

export const s = StyleSheet.create({
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

export function Header({ ctx }: { ctx: PdfContext }) {
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

export function Footer({ ctx }: { ctx: PdfContext }) {
  return (
    <View style={s.footer} fixed>
      <Text>{pdfText(`${ctx.title} — ${ctx.subtitle}`)}</Text>
      <Text>{pdfText(formatDate(new Date(), ctx.company.timezone))}</Text>
      <Text render={({ pageNumber, totalPages }) => pdfText(ctx.t("pdf.page", { page: pageNumber, pages: totalPages }))} />
    </View>
  );
}

export function TitleBlock({ ctx }: { ctx: PdfContext }) {
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
