/** Checklists — pure, unit tested. */
export type ChecklistItem = { label: string };
export type CheckResult = "pass" | "fail" | "na";
export type ResultRow = { label: string; result: CheckResult | null; note: string };

export function parseItems(text: string): ChecklistItem[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*[-*•\d.)]+\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 200)
    .map((label) => ({ label }));
}

export function itemsToText(value: unknown): string {
  return Array.isArray(value)
    ? value.map((i) => (typeof i === "object" && i && "label" in i ? String((i as ChecklistItem).label) : String(i))).join("\n")
    : "";
}

/** Results for a template, keeping answers already given for the same labels. */
export function mergeResults(items: readonly ChecklistItem[], previous: readonly ResultRow[]): ResultRow[] {
  const prev = new Map(previous.map((r) => [r.label, r]));
  return items.map((i) => prev.get(i.label) ?? { label: i.label, result: null, note: "" });
}

/** Passed when every applicable point passes; failed as soon as one fails; draft otherwise. */
export function inspectionOutcome(rows: readonly ResultRow[]): "draft" | "passed" | "failed" {
  if (rows.some((r) => r.result === "fail")) return "failed";
  if (rows.length > 0 && rows.every((r) => r.result === "pass" || r.result === "na")) return "passed";
  return "draft";
}
