import { describe, expect, it } from "vitest";
import { formToPayload, rowToForm } from "./values";
import type { FieldDef } from "./types";

const fields: FieldDef[] = [
  { name: "name", label: "Name", type: "text", required: true },
  { name: "amount", label: "Amount", type: "money", min: 0 },
  { name: "rate", label: "Rate", type: "percent" },
  { name: "date", label: "Date", type: "date" },
  { name: "supplier_id", label: "Supplier", type: "relation" },
  { name: "paid", label: "Paid", type: "checkbox" },
  { name: "hidden", label: "Hidden", type: "text", visible: (v) => v.paid === true },
];

describe("crud values", () => {
  it("converts form strings to typed payloads", () => {
    const { payload, errors } = formToPayload(
      fields,
      { name: " Ciment ", amount: "12 500,6", rate: "7,5", date: "2026-01-05", supplier_id: "", paid: false, hidden: "x" },
      "DJF",
    );
    expect(errors).toEqual([]);
    expect(payload).toEqual({ name: "Ciment", amount: 12501, rate: 7.5, date: "2026-01-05", supplier_id: null, paid: false });
  });
  it("reports required, number and range errors", () => {
    const { errors } = formToPayload(
      fields,
      { name: "", amount: "-1", rate: "120", date: "", supplier_id: "", paid: true, hidden: "" },
      "ETB",
    );
    expect(errors).toEqual([
      { field: "name", code: "required" },
      { field: "amount", code: "min" },
      { field: "rate", code: "max" },
    ]);
    expect(formToPayload(fields, { name: "x", amount: "abc" }, "USD").errors).toEqual([{ field: "amount", code: "number" }]);
  });
  it("prefills from a row", () => {
    expect(rowToForm(fields.slice(0, 2), { name: "A", amount: 10 })).toEqual({ name: "A", amount: "10" });
    expect(rowToForm([{ name: "x", label: "x", type: "checkbox", defaultValue: true }], null)).toEqual({ x: true });
  });
});
