import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { Loader2, MailCheck } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { errorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { AuthLayout } from "./AuthLayout";
import { emailSchema } from "./schemas";

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const schema = z.object({ email: emailSchema(t) });
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { email: "" } });

  const onSubmit = form.handleSubmit(async ({ email }) => {
    setFormError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    if (error) setFormError(errorMessage(t, error));
    else setSent(true);
  });

  return (
    <AuthLayout
      title={t("auth.forgotPasswordTitle")}
      description={sent ? undefined : t("auth.forgotPasswordHint")}
      footer={
        <Link to="/login" className="font-medium text-primary hover:underline">
          {t("auth.backToSignIn")}
        </Link>
      }
    >
      {sent ? (
        <div className="flex flex-col items-center gap-3 text-center">
          <MailCheck className="size-10 text-success" aria-hidden />
          <p>{t("auth.resetLinkSent")}</p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="grid gap-4" noValidate>
          <FormField id="email" label={t("auth.email")} error={form.formState.errors.email?.message} required>
            <Input type="email" autoComplete="email" inputMode="email" {...form.register("email")} />
          </FormField>
          {formError ? (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          ) : null}
          <Button type="submit" size="touch" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : null}
            {t("auth.sendResetLink")}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
