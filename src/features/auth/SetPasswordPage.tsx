import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { z } from "zod";
import { supabase } from "@/lib/supabase";
import { errorMessage } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { LoadingScreen } from "@/components/common/States";
import { AuthLayout } from "./AuthLayout";
import { useAuth } from "./AuthProvider";
import { newPasswordSchema } from "./schemas";

/**
 * Used for both password reset (/reset-password) and first sign-in from an
 * invitation email (/accept-invite). The link signs the user in; here they
 * choose a password.
 */
export function SetPasswordPage({ mode }: { mode: "reset" | "invite" }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { session, loading, clearRecovery } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const schema = newPasswordSchema(t);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { password: "", confirmPassword: "" } });

  if (loading) return <LoadingScreen />;
  if (!session) return <Navigate to={mode === "reset" ? "/forgot-password" : "/login"} replace />;

  const onSubmit = form.handleSubmit(async ({ password }) => {
    setFormError(null);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setFormError(errorMessage(t, error));
      return;
    }
    if (mode === "invite" && fullName.trim()) {
      await supabase.from("profiles").update({ full_name: fullName.trim() }).eq("id", session.user.id);
    }
    clearRecovery();
    toast.success(t("auth.passwordUpdated"));
    navigate(mode === "invite" ? "/onboarding" : "/", { replace: true });
  });

  const { errors, isSubmitting } = form.formState;
  return (
    <AuthLayout
      title={mode === "invite" ? t("auth.welcomeInvited") : t("auth.setNewPassword")}
      description={mode === "invite" ? t("auth.welcomeInvitedHint") : undefined}
    >
      <form onSubmit={onSubmit} className="grid gap-4" noValidate>
        {mode === "invite" ? (
          <FormField id="fullName" label={t("auth.fullName")}>
            <Input autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </FormField>
        ) : null}
        <FormField id="password" label={t("auth.newPassword")} error={errors.password?.message} required>
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
          {t("common.save")}
        </Button>
      </form>
    </AuthLayout>
  );
}
