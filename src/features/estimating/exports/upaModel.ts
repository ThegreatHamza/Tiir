/** Unit price analyses (sous-détails de prix) as a document model. Pure, unit tested. */
import { componentAmount, sellingPrice, upaDryCost } from "@/lib/calc/estimating";
import type { CurrencyCode } from "@/lib/calc/money";

export type UpaDocInput = {
  id: string;
  code: string;
  title: string;
  unit: string;
  coefficient: number;
  components: {
    kind: string;
    designation: string;
    unit: string;
    quantity: number;
    unit_cost: number;
    waste_rate: number;
    position: number;
  }[];
};

export type UpaDoc = {
  code: string;
  title: string;
  unit: string;
  coefficient: number;
  groups: {
    kind: string;
    lines: { designation: string; unit: string; quantity: number; unitCost: number; waste: number; amount: number }[];
    subtotal: number;
  }[];
  dryCost: number;
  sellingPrice: number;
};

const KIND_ORDER = ["material", "labour", "equipment", "subcontract"];

export function buildUpaDocs(upas: readonly UpaDocInput[], currency: CurrencyCode): UpaDoc[] {
  return [...upas]
    .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }))
    .map((u) => {
      const comps = [...u.components].sort((a, b) => a.position - b.position);
      const groups = KIND_ORDER.map((kind) => {
        const lines = comps
          .filter((c) => c.kind === kind)
          .map((c) => ({
            designation: c.designation,
            unit: c.unit,
            quantity: c.quantity,
            unitCost: c.unit_cost,
            waste: c.waste_rate,
            amount: componentAmount(c, currency),
          }));
        return {
          kind,
          lines,
          subtotal: upaDryCost(
            comps.filter((c) => c.kind === kind),
            currency,
          ),
        };
      }).filter((g) => g.lines.length > 0);
      const dry = upaDryCost(comps, currency);
      return {
        code: u.code,
        title: u.title,
        unit: u.unit,
        coefficient: u.coefficient,
        groups,
        dryCost: dry,
        sellingPrice: sellingPrice(dry, u.coefficient, currency),
      };
    });
}
