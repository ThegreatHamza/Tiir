import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/common/States";
import { useCurrentCompany } from "@/features/companies/CompanyProvider";
import { nonNegativeField, optionalPercentField, percentField, positiveField } from "@/features/settings/rateSchema";
import { qk } from "@/lib/queryKeys";
import { errorMessage } from "@/lib/errors";
import { roundMoney, type CurrencyCode } from "@/lib/calc/money";
import { fetchProjectSettings, updateProjectSettings } from "./api";

type FormIn = Record<
  "vat_rate" | "retention_rate" | "retention_cap_rate" | "advance_amount" | "advance_recovery_rate" | "price_coefficient",
  string
>;

export function ProjectSettingsCard({ projectId, currency, readOnly }: { projectId: string; currency: CurrencyCode; readOnly: boolean }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { companyId } = useCurrentCompany();
  const key = qk.projectSettings(companyId, projectId);
  const query = useQuery({ queryKey: key, queryFn: () => fetchProjectSettings(projectId) });

  const schema = z.object({
    vat_rate: percentField(t),
    retention_rate: percentField(t),
    retention_cap_rate: optionalPercentField(t),
    advance_amount: nonNegativeField(t),
    advance_recovery_rate: percentField(t),
    price_coefficient: positiveField(t),
  });
  type Out = z.infer<typeof schema>;

  const form = useForm<FormIn, unknown, Out>({ resolver: zodResolver(schema) });
  useEffect(() => {
    const s = query.data;
    if (s)
      form.reset({
        vat_rate: String(s.vat_rate),
        retention_rate: String(s.retention_rate),
        retention_cap_rate: s.retention_cap_rate === null ? "" : String(s.retention_cap_rate),
        advance_amount: String(s.advance_amount),
        advance_recovery_rate: String(s.advance_recovery_rate),
        price_coefficient: String(s.price_coefficient),
      });
  }, [query.data, form]);

  const save = useMutation({
    mutationFn: (v: Out) => updateProjectSettings(projectId, { ...v, advance_amount: roundMoney(v.advance_amount, currency) }),
    onSuccess: async () => {
      toast.success(t("common.saved"));
      await queryClient.invalidateQueries({ queryKey: key });
    },
    onError: (e) => toast.error(errorMessage(t, e)),
  });

  if (query.isLoading) return <Skeleton className="h-56" />;
  if (query.error) return <ErrorState message={errorMessage(t, query.error)} onRetry={() => void query.refetch()} />;

  const { errors } = form.formState;
  const field = (name: keyof FormIn, label: string, hint?: string, suffix = "%") => (
    <FormField id={`ps-${name}`} label={label} error={errors[name]?.message} hint={hint}>
      <div className="relative">
        <Input inputMode="decimal" disabled={readOnly} className="pe-12 ltr-nums" {...form.register(name)} />
        <span className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>
      </div>
    </FormField>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("projects.settingsTitle")}</CardTitle>
        <CardDescription>{t("projects.settingsHint")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" noValidate onSubmit={form.handleSubmit((v) => save.mutate(v))}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {field("price_coefficient", t("settings.priceCoefficient"), t("settings.priceCoefficientHint"), "×")}
            {field("vat_rate", t("settings.vatRate"))}
            {field("retention_rate", t("settings.retentionRate"))}
            {field("retention_cap_rate", t("settings.retentionCapRate"), t("settings.retentionCapHint"))}
            {field("advance_amount", t("settings.advanceAmount"), undefined, currency)}
            {field("advance_recovery_rate", t("settings.advanceRecoveryRate"))}
          </div>
          {!readOnly ? (
            <div>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? <Loader2 className="animate-spin" /> : null}
                {t("common.save")}
              </Button>
            </div>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
