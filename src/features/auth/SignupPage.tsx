import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { Loader2, MailCheck } from "lucide-react";
import type { z } from "zod";
import { supabase } from "@/lib/supabase";
import { errorMessage } from "@/lib/errors";
import { currentLanguage } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { FormField } from "@/components/ui/form-field";
import { AuthLayout } from "./AuthLayout";
import { signupSchema } from "./schemas";

export function SignupPage() {
  const { t } = useTranslation();
  const [formError, setFormError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const schema = signupSchema(t);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "", companyName: "", country: "DJ", currency: "DJF", email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = form.handleSubmit(async (v) => {
    setFormError(null);
    const { data, error } = await supabase.auth.signUp({
      email: v.email,
      password: v.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          full_name: v.fullName,
          company_name: v.companyName,
          country: v.country,
          currency: v.currency,
          language: currentLanguage(),
        },
      },
    });
    if (error) {
      setFormError(errorMessage(t, error));
      return;
    }
    // With email confirmation on, there is no session yet.
    if (!data.session) setSentTo(v.email);
  });

  if (sentTo) {
    return (
      <AuthLayout title={t("auth.checkEmailTitle")}>
        <div className="flex flex-col items-center gap-3 text-center">
          <MailCheck className="size-10 text-success" aria-hidden />
          <p>{t("auth.checkEmail", { email: sentTo })}</p>
          <Link to="/login" className="font-medium text-primary hover:underline">
            {t("auth.backToSignIn")}
          </Link>
        </div>
      </AuthLayout>
    );
  }

  const { errors, isSubmitting } = form.formState;
  return (
    <AuthLayout
      title={t("auth.signUpTitle")}
      description={t("auth.signUpSubtitle")}
      footer={
        <>
          {t("auth.haveAccount")}{" "}
          <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            {t("auth.signIn")}
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="grid gap-4" noValidate>
        <FormField id="fullName" label={t("auth.fullName")} error={errors.fullName?.message} required>
          <Input autoComplete="name" {...form.register("fullName")} />
        </FormField>
        <FormField id="companyName" label={t("auth.companyName")} error={errors.companyName?.message} required>
          <Input autoComplete="organization" {...form.register("companyName")} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField id="country" label={t("common.country")}>
            <NativeSelect
              {...form.register("country", {
                onChange: (e: { target: { value: string } }) => form.setValue("currency", e.target.value === "ET" ? "ETB" : "DJF"),
              })}
            >
              <option value="DJ">{t("countries.DJ")}</option>
              <option value="ET">{t("countries.ET")}</option>
            </NativeSelect>
          </FormField>
          <FormField id="currency" label={t("companies.defaultCurrency")}>
            <NativeSelect {...form.register("currency")}>
              <option value="DJF">{t("currencies.DJF")}</option>
              <option value="ETB">{t("currencies.ETB")}</option>
              <option value="USD">{t("currencies.USD")}</option>
            </NativeSelect>
          </FormField>
        </div>
        <FormField id="email" label={t("auth.email")} error={errors.email?.message} required>
          <Input type="email" autoComplete="email" inputMode="email" {...form.register("email")} />
        </FormField>
        <FormField id="password" label={t("auth.password")} error={errors.password?.message} required>
          <Input type="password" autoComplete="new-password" {...form.register("password")} />
        </FormField>
        <FormField id="confirmPassword" label={t("auth.confirmPassword")} error={errors.confirmPassword?.message} required>
          <Input type="password" autoComplete="new-password" {...form.register("confirmPassword")} />
        </FormField>
        {formError ? (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        ) : null}
        <Button type="submit" size="touch" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : null}
          {t("auth.createAccount")}
        </Button>
      </form>
    </AuthLayout>
  );
}
