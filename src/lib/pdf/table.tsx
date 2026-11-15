/** Generic tabular PDF document with the company header (registers, reports, payslips). */
import { Document, Page, Text, View } from "@react-pdf/renderer";
import { Footer, Header, TitleBlock, pdfText, s, type PdfContext } from "./common";

export type PdfColumn = { label: string; width: string; align?: "left" | "right" };
export type PdfRow = { cells: string[]; style?: "section" | "total" | "normal" };
export type PdfBlock = { heading?: string; columns: PdfColumn[]; rows: PdfRow[] };

export function TablePdf({
  ctx,
  blocks,
  landscape,
  note,
  signatures,
}: {
  ctx: PdfContext;
  blocks: PdfBlock[];
  landscape?: boolean;
  note?: string;
  signatures?: string[];
}) {
  return (
    <Document title={`${ctx.title} — ${ctx.subtitle}`} author={ctx.company.name} creator="Tiir" producer="Tiir">
      <Page size="A4" orientation={landscape ? "landscape" : "portrait"} style={s.page}>
        <Header ctx={ctx} />
        <TitleBlock ctx={ctx} />
        {blocks.map((b, bi) => (
          <View key={bi} style={{ marginBottom: 10 }}>
            {b.heading ? <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 10, marginBottom: 4 }}>{pdfText(b.heading)}</Text> : null}
            <View style={s.th} fixed>
              {b.columns.map((c, i) => (
                <Text key={i} style={[s.cell, { width: c.width }, c.align === "right" ? s.right : {}]}>
                  {pdfText(c.label)}
                </Text>
              ))}
            </View>
            {b.rows.map((r, ri) => (
              <View key={ri} style={r.style === "section" ? s.section : r.style === "total" ? s.subtotal : s.tr} wrap={false}>
                {r.cells.map((cell, ci) => (
                  <Text
                    key={ci}
                    style={[s.cell, { width: b.columns[ci]?.width ?? "10%" }, b.columns[ci]?.align === "right" ? s.right : {}]}
                  >
                    {pdfText(cell)}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        ))}
        {note ? <Text style={[s.small, { marginTop: 8 }]}>{pdfText(note)}</Text> : null}
        {signatures?.length ? (
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 30 }} wrap={false}>
            {signatures.map((sig) => (
              <View
                key={sig}
                style={{ width: `${Math.floor(90 / signatures.length)}%`, borderTopWidth: 0.5, borderTopColor: "#6b7280", paddingTop: 4 }}
              >
                <Text style={s.small}>{pdfText(sig)}</Text>
              </View>
            ))}
          </View>
        ) : null}
        <Footer ctx={ctx} />
      </Page>
    </Document>
  );
}
