import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentCompany } from "@/features/companies/CompanyProvider";
import { nonNegativeField } from "@/features/settings/rateSchema";
import { CURRENCIES, roundMoney } from "@/lib/calc/money";
import { RESOURCE_KINDS } from "@/lib/import/priceResources";
import { UNITS } from "@/lib/units";
import type { PriceResource } from "./api";

export type ResourceFormOut = {
  code: string;
  name: string;
  kind: PriceResource["kind"];
  unit: PriceResource["unit"];
  unit_cost: number;
  currency: PriceResource["currency"];
  supplier_name: string | null;
  notes: string | null;
};

export function ResourceFormDialog({
  open,
  onOpenChange,
  resource,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  resource: PriceResource | null;
  onSubmit: (v: ResourceFormOut) => Promise<void>;
}) {
  const { t } = useTranslation();
  const { company } = useCurrentCompany();
  const schema = z.object({
    code: z.string().trim().min(1, t("validation.required")).max(40),
    name: z.string().trim().min(1, t("validation.required")).max(300),
    kind: z.enum(["material", "labour", "equipment", "subcontract"]),
    unit: z.enum(UNITS),
    unit_cost: nonNegativeField(t),
    currency: z.enum(["DJF", "ETB", "USD"]),
    supplier_name: z.string().trim().max(200),
    notes: z.string().trim().max(2000),
  });
  type In = z.input<typeof schema>;
  type Out = z.output<typeof schema>;
  const defaults = (): In => ({
    code: resource?.code ?? "",
    name: resource?.name ?? "",
    kind: resource?.kind ?? "material",
    unit: resource?.unit ?? "u",
    unit_cost: resource ? String(resource.unit_cost) : "",
    currency: resource?.currency ?? company.default_currency,
    supplier_name: resource?.supplier_name ?? "",
    notes: resource?.notes ?? "",
  });
  const form = useForm<In, unknown, Out>({ resolver: zodResolver(schema), defaultValues: defaults() });
  useEffect(() => {
    if (open) form.reset(defaults());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, resource?.id]);
  const { errors, isSubmitting } = form.formState;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{resource ? t("estimating.resources.edit") : t("estimating.resources.new")}</DialogTitle>
          <DialogDescription>{t("estimating.resources.formHint")}</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          noValidate
          onSubmit={form.handleSubmit(async (v) => {
            try {
              await onSubmit({
                ...v,
                unit_cost: roundMoney(v.unit_cost, v.currency),
                supplier_name: v.supplier_name || null,
                notes: v.notes || null,
              });
            } catch {
              /* the caller shows the error */
            }
          })}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField id="r-code" label={t("common.code")} error={errors.code?.message} required>
              <Input {...form.register("code")} className="ltr-nums" />
            </FormField>
            <FormField id="r-name" label={t("estimating.designation")} error={errors.name?.message} required className="sm:col-span-2">
              <Input {...form.register("name")} />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="r-kind" label={t("estimating.resources.kind")}>
              <NativeSelect {...form.register("kind")}>
                {RESOURCE_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {t(`estimating.kinds.${k}`)}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField id="r-unit" label={t("estimating.unit")}>
              <NativeSelect {...form.register("unit")}>
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {t(`units.${u}`)}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField id="r-cost" label={t("estimating.unitCost")} error={errors.unit_cost?.message} required>
              <Input inputMode="decimal" {...form.register("unit_cost")} className="ltr-nums" />
            </FormField>
            <FormField id="r-currency" label={t("common.currency")}>
              <NativeSelect {...form.register("currency")}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {t(`currencies.${c}`)}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
          </div>
          <FormField id="r-supplier" label={t("estimating.resources.supplier")}>
            <Input {...form.register("supplier_name")} />
          </FormField>
          <FormField id="r-notes" label={t("common.notes")}>
            <Textarea rows={2} {...form.register("notes")} />
          </FormField>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : null}
              {resource ? t("common.save") : t("common.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
