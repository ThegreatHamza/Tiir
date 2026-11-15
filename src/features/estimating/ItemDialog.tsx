import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { errorMessage } from "@/lib/errors";
import { formatMoney, formatNumber } from "@/lib/format";
import { parseAmount } from "@/lib/import/priceResources";
import { UNITS, type UnitCode } from "@/lib/units";
import { roundMoney, type CurrencyCode } from "@/lib/calc/money";
import { currentLanguage } from "@/i18n";
import { reorderItems, updateItem, type BoqItemValue, type BoqSection, type UpaValue, type VersionScope } from "./api";
import { useEstimateCache } from "./queries";
import { TakeoffEditor } from "./TakeoffEditor";

type Draft = {
  code: string;
  description: string;
  unit: UnitCode;
  section_id: string;
  quantity_source: "manual" | "takeoff";
  quantity: string;
  pricing: "manual" | "analysis";
  upa_id: string;
  unit_cost: string;
  unit_price: string;
  notes: string;
};

export function ItemDialog({
  item,
  scope,
  currency,
  sections,
  sectionItems,
  upas,
  readOnly,
  onOpenChange,
}: {
  item: BoqItemValue | null;
  scope: VersionScope;
  currency: CurrencyCode;
  sections: BoqSection[];
  sectionItems: (sectionId: string) => string[];
  upas: UpaValue[];
  readOnly: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const cache = useEstimateCache(scope.versionId);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!item) return setDraft(null);
    setError(null);
    setDraft({
      code: item.code,
      description: item.description,
      unit: item.unit,
      section_id: item.section_id,
      quantity_source: item.quantity_source,
      quantity: String(item.quantity),
      pricing: item.upa_id ? "analysis" : "manual",
      upa_id: item.upa_id ?? "",
      unit_cost: item.unit_cost === null ? "" : String(item.unit_cost),
      unit_price: item.unit_price === null ? "" : String(item.unit_price),
      notes: item.notes ?? "",
    });
    // Re-initialise only when another item is opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  if (!item || !draft) return null;
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));

  async function save() {
    if (!item || !draft) return;
    const num = (s: string) => (s.trim() === "" ? null : parseAmount(s));
    const qty = num(draft.quantity);
    const cost = num(draft.unit_cost);
    const price = num(draft.unit_price);
    if (!draft.description.trim()) return setError(t("validation.required"));
    if (
      (draft.quantity.trim() && (qty === null || qty < 0)) ||
      (draft.unit_cost.trim() && (cost === null || cost < 0)) ||
      (draft.unit_price.trim() && (price === null || price < 0))
    ) {
      return setError(t("validation.number"));
    }
    if (draft.pricing === "analysis" && !draft.upa_id) return setError(t("estimating.item.chooseAnalysis"));
    setSaving(true);
    setError(null);
    try {
      await updateItem(item.id, {
        code: draft.code.trim(),
        description: draft.description.trim(),
        unit: draft.unit,
        quantity_source: draft.quantity_source,
        quantity: qty ?? 0,
        upa_id: draft.pricing === "analysis" ? draft.upa_id : null,
        unit_cost: draft.pricing === "manual" && cost !== null ? roundMoney(cost, currency) : null,
        unit_price: price === null ? null : roundMoney(price, currency),
        notes: draft.notes.trim() || null,
      });
      if (draft.section_id !== item.section_id) {
        await reorderItems(draft.section_id, [...sectionItems(draft.section_id), item.id]);
        await cache.invalidateItems();
      }
      await cache.refreshItem(item.id);
      toast.success(t("common.saved"));
      onOpenChange(false);
    } catch (e) {
      setError(errorMessage(t, e));
    } finally {
      setSaving(false);
    }
  }

  const selectedUpa = upas.find((u) => u.id === draft.upa_id);

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            <span className="font-mono text-sm text-muted-foreground ltr-nums">{item.code}</span> {item.description.slice(0, 80)}
          </DialogTitle>
          <DialogDescription>
            {t("estimating.item.summary", {
              quantity: formatNumber(item.effective_quantity, lang, 3),
              unit: t(`units.${item.unit}`),
              price: formatMoney(item.effective_unit_price, currency, lang),
              total: formatMoney(item.total_price, currency, lang),
            })}
          </DialogDescription>
        </DialogHeader>

        <fieldset disabled={readOnly} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-4">
            <FormField id="it-code" label={t("common.code")}>
              <Input value={draft.code} onChange={(e) => set("code", e.target.value)} className="ltr-nums" />
            </FormField>
            <FormField id="it-unit" label={t("estimating.unit")}>
              <NativeSelect value={draft.unit} onChange={(e) => set("unit", e.target.value as UnitCode)}>
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {t(`units.${u}`)}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField id="it-section" label={t("estimating.item.section")} className="sm:col-span-2">
              <NativeSelect value={draft.section_id} onChange={(e) => set("section_id", e.target.value)}>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code ? `${s.code} — ` : ""}
                    {s.title}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
          </div>
          <FormField id="it-desc" label={t("estimating.designation")} required>
            <Textarea rows={2} value={draft.description} onChange={(e) => set("description", e.target.value)} />
          </FormField>

          <Separator />
          <div className="grid gap-3">
            <p className="text-sm font-semibold">{t("estimating.quantity")}</p>
            <div className="flex flex-wrap gap-4" role="radiogroup" aria-label={t("estimating.item.quantitySource")}>
              {(["manual", "takeoff"] as const).map((src) => (
                <label key={src} className="flex min-h-9 items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="qsource"
                    checked={draft.quantity_source === src}
                    onChange={() => {
                      set("quantity_source", src);
                      // Switching to takeoff is saved at once so measurement lines can be entered.
                      if (src === "takeoff" && item.quantity_source !== "takeoff") {
                        void updateItem(item.id, { quantity_source: "takeoff" })
                          .then(() => cache.refreshItem(item.id))
                          .catch((e: unknown) => setError(errorMessage(t, e)));
                      }
                    }}
                    className="size-4 accent-[hsl(var(--primary))]"
                  />
                  {t(`estimating.item.sources.${src}`)}
                </label>
              ))}
            </div>
            {draft.quantity_source === "manual" ? (
              <FormField id="it-qty" label={t("estimating.quantity")} className="sm:w-48">
                <Input
                  inputMode="decimal"
                  value={draft.quantity}
                  onChange={(e) => set("quantity", e.target.value)}
                  className="text-end ltr-nums"
                />
              </FormField>
            ) : item.quantity_source === "takeoff" ? (
              <TakeoffEditor scope={scope} itemId={item.id} unitLabel={t(`units.${item.unit}`)} readOnly={readOnly} />
            ) : (
              <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label={t("common.loading")} />
            )}
          </div>

          <Separator />
          <div className="grid gap-3">
            <p className="text-sm font-semibold">{t("estimating.item.pricing")}</p>
            <div className="flex flex-wrap gap-4" role="radiogroup" aria-label={t("estimating.item.pricing")}>
              {(["manual", "analysis"] as const).map((p) => (
                <label key={p} className="flex min-h-9 items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="pricing"
                    checked={draft.pricing === p}
                    onChange={() => set("pricing", p)}
                    className="size-4 accent-[hsl(var(--primary))]"
                  />
                  {t(`estimating.item.pricingModes.${p}`)}
                </label>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {draft.pricing === "manual" ? (
                <FormField id="it-cost" label={t("estimating.dryUnitCost")}>
                  <Input
                    inputMode="decimal"
                    value={draft.unit_cost}
                    onChange={(e) => set("unit_cost", e.target.value)}
                    className="text-end ltr-nums"
                  />
                </FormField>
              ) : (
                <FormField
                  id="it-upa"
                  label={t("estimating.item.analysis")}
                  className="sm:col-span-2"
                  hint={
                    selectedUpa
                      ? t("estimating.item.analysisHint", {
                          dry: formatMoney(selectedUpa.dry_cost, currency, lang),
                          price: formatMoney(selectedUpa.selling_price, currency, lang),
                        })
                      : undefined
                  }
                >
                  <NativeSelect value={draft.upa_id} onChange={(e) => set("upa_id", e.target.value)}>
                    <option value="">{t("estimating.item.chooseAnalysis")}</option>
                    {upas.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.code} — {u.title} ({t(`units.${u.unit}`)})
                      </option>
                    ))}
                  </NativeSelect>
                </FormField>
              )}
              <FormField id="it-price" label={t("estimating.item.priceOverride")} hint={t("estimating.item.priceOverrideHint")}>
                <Input
                  inputMode="decimal"
                  value={draft.unit_price}
                  onChange={(e) => set("unit_price", e.target.value)}
                  className="text-end ltr-nums"
                />
              </FormField>
            </div>
          </div>

          <FormField id="it-notes" label={t("common.notes")}>
            <Textarea rows={2} value={draft.notes} onChange={(e) => set("notes", e.target.value)} />
          </FormField>
        </fieldset>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {readOnly ? t("common.close") : t("common.cancel")}
          </Button>
          {!readOnly ? (
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : null}
              {t("common.save")}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
