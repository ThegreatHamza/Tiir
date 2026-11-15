import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/common/States";
import { useCurrentCompany } from "@/features/companies/CompanyProvider";
import { qk } from "@/lib/queryKeys";
import { errorMessage } from "@/lib/errors";
import { fetchCompanySettings, updateCompanySettings } from "./api";
import { percentField, positiveField } from "./rateSchema";

type In = {
  vat_rate: string;
  retention_rate: string;
  advance_recovery_rate: string;
  price_coefficient: string;
  overtime_multiplier: string;
  working_hours_per_day: string;
  low_stock_alerts: boolean;
};

export function CompanyRatesCard() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { companyId } = useCurrentCompany();
  const key = qk.companySettings(companyId);
  const query = useQuery({ queryKey: key, queryFn: () => fetchCompanySettings(companyId) });

  const schema = z.object({
    vat_rate: percentField(t),
    retention_rate: percentField(t),
    advance_recovery_rate: percentField(t),
    price_coefficient: positiveField(t),
    overtime_multiplier: positiveField(t),
    working_hours_per_day: positiveField(t).pipe(z.number().max(24, t("validation.hoursRange"))),
    low_stock_alerts: z.boolean(),
  });
  type Out = z.infer<typeof schema>;
  const form = useForm<In, unknown, Out>({ resolver: zodResolver(schema) });

  useEffect(() => {
    const s = query.data;
    if (s)
      form.reset({
        vat_rate: String(s.vat_rate),
        retention_rate: String(s.retention_rate),
        advance_recovery_rate: String(s.advance_recovery_rate),
        price_coefficient: String(s.price_coefficient),
        overtime_multiplier: String(s.overtime_multiplier),
        working_hours_per_day: String(s.working_hours_per_day),
        low_stock_alerts: s.low_stock_alerts,
      });
  }, [query.data, form]);

  const save = useMutation({
    mutationFn: (v: Out) => updateCompanySettings(companyId, v),
    onSuccess: async () => {
      toast.success(t("common.saved"));
      await queryClient.invalidateQueries({ queryKey: key });
    },
    onError: (e) => toast.error(errorMessage(t, e)),
  });

  if (query.isLoading) return <Skeleton className="h-56" />;
  if (query.error) return <ErrorState message={errorMessage(t, query.error)} onRetry={() => void query.refetch()} />;

  const { errors } = form.formState;
  const field = (name: Exclude<keyof In, "low_stock_alerts">, label: string, suffix: string, hint?: string) => (
    <FormField id={`cs-${name}`} label={label} error={errors[name]?.message} hint={hint}>
      <div className="relative">
        <Input inputMode="decimal" className="pe-12 ltr-nums" {...form.register(name)} />
        <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>
      </div>
    </FormField>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.ratesTitle")}</CardTitle>
        <CardDescription>{t("settings.ratesHint")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" noValidate onSubmit={form.handleSubmit((v) => save.mutate(v))}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {field("price_coefficient", t("settings.priceCoefficient"), "×", t("settings.priceCoefficientHint"))}
            {field("vat_rate", t("settings.vatRate"), "%")}
            {field("retention_rate", t("settings.retentionRate"), "%")}
            {field("advance_recovery_rate", t("settings.advanceRecoveryRate"), "%")}
            {field("overtime_multiplier", t("settings.overtimeMultiplier"), "×")}
            {field("working_hours_per_day", t("settings.hoursPerDay"), t("settings.hoursUnit"))}
          </div>
          <Controller
            control={form.control}
            name="low_stock_alerts"
            render={({ field }) => (
              <label className="flex min-h-10 items-center gap-3 text-sm">
                <Checkbox checked={field.value} onCheckedChange={(v) => field.onChange(v === true)} />
                {t("settings.lowStockAlerts")}
              </label>
            )}
          />
          <div>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? <Loader2 className="animate-spin" /> : null}
              {t("common.save")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
