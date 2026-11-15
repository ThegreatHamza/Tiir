/** Estimating PDF documents: priced/unpriced BoQ and unit price analyses. */
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { formatMoney, formatNumber } from "@/lib/format";
import { Footer, Header, TitleBlock, pdfText, s, type PdfContext } from "@/lib/pdf/common";
import type { BoqDocument } from "./boqModel";
import type { UpaDoc } from "./upaModel";

export { downloadPdf, pdfText } from "@/lib/pdf/common";
export type { PdfCompany, PdfContext } from "@/lib/pdf/common";

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
