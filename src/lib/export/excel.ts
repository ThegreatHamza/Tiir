export type ExcelColumn<T> = {
  header: string;
  value: (row: T) => string | number | boolean | null | undefined;
  /** Excel number format, e.g. "#,##0" for DJF or "#,##0.00" for ETB/USD. */
  numFmt?: string;
  width?: number;
};

/** Builds the worksheet rows (header first). Pure, unit tested. */
export function buildSheetRows<T>(columns: readonly ExcelColumn<T>[], rows: readonly T[]): (string | number | boolean | null)[][] {
  const out: (string | number | boolean | null)[][] = [columns.map((c) => c.header)];
  for (const row of rows) out.push(columns.map((c) => c.value(row) ?? null));
  return out;
}

export function safeFileName(name: string): string {
  return (
    name
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^\w\-. ]+/g, "")
      .trim()
      .replace(/\s+/g, "_")
      .slice(0, 80) || "export"
  );
}

/**
 * Writes an .xlsx file in the browser. SheetJS is loaded on demand so it
 * does not weigh on the first page load (slow site connections).
 */
export async function exportToExcel<T>(
  fileName: string,
  sheetName: string,
  columns: readonly ExcelColumn<T>[],
  rows: readonly T[],
): Promise<void> {
  const { utils, writeFile } = await import("xlsx");
  const data = buildSheetRows(columns, rows);
  const ws = utils.aoa_to_sheet(data);
  ws["!cols"] = columns.map((c) => ({ wch: c.width ?? Math.max(10, c.header.length + 2) }));
  columns.forEach((c, ci) => {
    if (!c.numFmt) return;
    for (let r = 1; r < data.length; r++) {
      const cell = ws[utils.encode_cell({ r, c: ci })];
      if (cell && typeof cell.v === "number") cell.z = c.numFmt;
    }
  });
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, sheetName.slice(0, 31) || "Sheet1");
  const date = new Date().toISOString().slice(0, 10);
  writeFile(wb, `${safeFileName(fileName)}_${date}.xlsx`);
}

export function moneyNumFmt(decimals: number): string {
  return decimals === 0 ? "#,##0" : `#,##0.${"0".repeat(decimals)}`;
}

/** A sheet described cell by cell (values, formulas, number formats). */
export type ModelCell = { v?: string | number | null; f?: string; z?: string };
export type SheetSpec = { name: string; rows: ModelCell[][]; cols?: number[] };

/** Writes a workbook whose cells can carry live formulas (=ROUND(D6*E6,0), =SUM(...)). */
export async function exportWorkbook(fileName: string, sheets: readonly SheetSpec[]): Promise<void> {
  const { utils, writeFile } = await import("xlsx");
  const wb = utils.book_new();
  for (const s of sheets) {
    const ws = utils.aoa_to_sheet(s.rows.map((r) => r.map((c) => (c.f ? null : (c.v ?? null)))));
    s.rows.forEach((r, ri) =>
      r.forEach((c, ci) => {
        if (!c.f && !c.z) return;
        const ref = utils.encode_cell({ r: ri, c: ci });
        const cell = ws[ref] ?? { t: "n" };
        if (c.f) {
          cell.f = c.f;
          cell.t = "n";
          if (typeof c.v === "number") cell.v = c.v;
        }
        if (c.z) cell.z = c.z;
        ws[ref] = cell;
      }),
    );
    const range = utils.decode_range(ws["!ref"] ?? "A1");
    range.e.c = Math.max(range.e.c, Math.max(...s.rows.map((r) => r.length)) - 1);
    ws["!ref"] = utils.encode_range(range);
    if (s.cols) ws["!cols"] = s.cols.map((wch) => ({ wch }));
    utils.book_append_sheet(wb, ws, safeSheetName(s.name, wb.SheetNames));
  }
  writeFile(wb, `${safeFileName(fileName)}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/** Excel sheet names: max 31 chars, no []:*?/\ and unique. */
export function safeSheetName(name: string, taken: readonly string[] = []): string {
  const base =
    name
      .replace(/[[\]:*?/\\]/g, " ")
      .trim()
      .slice(0, 31) || "Sheet";
  let candidate = base;
  for (let i = 2; taken.includes(candidate); i++) candidate = `${base.slice(0, 28)} ${i}`;
  return candidate;
}
