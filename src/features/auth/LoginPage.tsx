import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import type { z } from "zod";
import { supabase } from "@/lib/supabase";
import { errorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { AuthLayout } from "./AuthLayout";
import { loginSchema } from "./schemas";

export function LoginPage() {
  const { t } = useTranslation();
  const [formError, setFormError] = useState<string | null>(null);
  const schema = loginSchema(t);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: values.email, password: values.password });
    if (error) setFormError(errorMessage(t, error));
  });

  const { errors, isSubmitting } = form.formState;
  return (
    <AuthLayout
      title={t("auth.signInTitle")}
      description={t("auth.tagline")}
      footer={
        <>
          {t("auth.noAccount")}{" "}
          <Link to="/signup" className="font-medium text-primary underline-offset-4 hover:underline">
            {t("auth.signUp")}
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="grid gap-4" noValidate>
        <FormField id="email" label={t("auth.email")} error={errors.email?.message} required>
          <Input type="email" autoComplete="email" inputMode="email" {...form.register("email")} />
        </FormField>
        <FormField id="password" label={t("auth.password")} error={errors.password?.message} required>
          <Input type="password" autoComplete="current-password" {...form.register("password")} />
        </FormField>
        {formError ? (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        ) : null}
        <Button type="submit" size="touch" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : null}
          {t("auth.signIn")}
        </Button>
        <Link to="/forgot-password" className="text-center text-sm text-muted-foreground underline-offset-4 hover:underline">
          {t("auth.forgotPassword")}
        </Link>
      </form>
    </AuthLayout>
  );
}
