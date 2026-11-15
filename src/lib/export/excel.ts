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
