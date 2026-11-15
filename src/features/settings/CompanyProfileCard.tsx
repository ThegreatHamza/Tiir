import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { NativeSelect } from "@/components/ui/native-select";
import { useCurrentCompany } from "@/features/companies/CompanyProvider";
import { useUser } from "@/features/auth/AuthProvider";
import { qk } from "@/lib/queryKeys";
import { errorMessage } from "@/lib/errors";
import { LANGUAGES } from "@/lib/format";
import { CURRENCIES } from "@/lib/calc/money";
import { updateCompany } from "./api";

export const TIME_ZONES = ["Africa/Djibouti", "Africa/Addis_Ababa"] as const;

export function CompanyProfileCard() {
  const { t } = useTranslation();
  const user = useUser();
  const queryClient = useQueryClient();
  const { company, companyId } = useCurrentCompany();

  const schema = z.object({
    name: z.string().trim().min(1, t("validation.required")).max(200),
    legal_name: z.string().trim().max(200),
    tax_id: z.string().trim().max(60),
    country: z.enum(["DJ", "ET"]),
    city: z.string().trim().max(120),
    address: z.string().trim().max(500),
    phone: z.string().trim().max(40),
    email: z.union([z.literal(""), z.string().trim().email(t("validation.email"))]),
    default_language: z.enum(["fr", "en", "ar", "so"]),
    default_currency: z.enum(["DJF", "ETB", "USD"]),
    timezone: z.enum(TIME_ZONES),
  });
  type V = z.infer<typeof schema>;
  const values = (): V => ({
    name: company.name,
    legal_name: company.legal_name ?? "",
    tax_id: company.tax_id ?? "",
    country: company.country,
    city: company.city ?? "",
    address: company.address ?? "",
    phone: company.phone ?? "",
    email: company.email ?? "",
    default_language: company.default_language,
    default_currency: company.default_currency,
    timezone: (TIME_ZONES as readonly string[]).includes(company.timezone) ? (company.timezone as V["timezone"]) : "Africa/Djibouti",
  });
  const form = useForm<V>({ resolver: zodResolver(schema), defaultValues: values() });
  useEffect(() => {
    form.reset(values());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company.id, company.updated_at]);

  const save = useMutation({
    mutationFn: (v: V) =>
      updateCompany(companyId, {
        ...v,
        legal_name: v.legal_name || null,
        tax_id: v.tax_id || null,
        city: v.city || null,
        address: v.address || null,
        phone: v.phone || null,
        email: v.email || null,
      }),
    onSuccess: async () => {
      toast.success(t("common.saved"));
      await queryClient.invalidateQueries({ queryKey: qk.memberships(user.id) });
    },
    onError: (e) => toast.error(errorMessage(t, e)),
  });

  const { errors } = form.formState;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.companyProfile")}</CardTitle>
        <CardDescription>{t("settings.companyProfileHint")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" noValidate onSubmit={form.handleSubmit((v) => save.mutate(v))}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="co-name" label={t("auth.companyName")} error={errors.name?.message} required>
              <Input {...form.register("name")} />
            </FormField>
            <FormField id="co-legal" label={t("settings.legalName")}>
              <Input {...form.register("legal_name")} />
            </FormField>
            <FormField id="co-tax" label={t("common.taxId")}>
              <Input {...form.register("tax_id")} className="ltr-nums" />
            </FormField>
            <FormField id="co-country" label={t("common.country")}>
              <NativeSelect {...form.register("country")}>
                <option value="DJ">{t("countries.DJ")}</option>
                <option value="ET">{t("countries.ET")}</option>
              </NativeSelect>
            </FormField>
            <FormField id="co-city" label={t("common.city")}>
              <Input {...form.register("city")} />
            </FormField>
            <FormField id="co-address" label={t("common.address")}>
              <Input {...form.register("address")} />
            </FormField>
            <FormField id="co-phone" label={t("common.phone")}>
              <Input type="tel" {...form.register("phone")} className="ltr-nums" />
            </FormField>
            <FormField id="co-email" label={t("auth.email")} error={errors.email?.message}>
              <Input type="email" {...form.register("email")} />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField id="co-lang" label={t("settings.defaultLanguage")} hint={t("settings.defaultLanguageHint")}>
              <NativeSelect {...form.register("default_language")}>
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>
                    {t(`languages.${l}`)}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField id="co-currency" label={t("companies.defaultCurrency")} hint={t("settings.defaultCurrencyHint")}>
              <NativeSelect {...form.register("default_currency")}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {t(`currencies.${c}`)}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField id="co-tz" label={t("settings.timezone")}>
              <NativeSelect {...form.register("timezone")}>
                {TIME_ZONES.map((z) => (
                  <option key={z} value={z}>
                    {t(`settings.timezones.${z.replace("/", "_")}`)}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
          </div>
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
