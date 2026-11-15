import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { useUser } from "@/features/auth/AuthProvider";
import { useCompanyContext } from "@/features/companies/CompanyProvider";
import { emailSchema, newPasswordSchema } from "@/features/auth/schemas";
import { supabase } from "@/lib/supabase";
import { qk } from "@/lib/queryKeys";
import { errorMessage } from "@/lib/errors";
import { LANGUAGES, type AppLanguage } from "@/lib/format";
import { applyTheme, type ThemeMode } from "@/lib/theme";
import { setLanguage } from "@/i18n";

function ProfileCard() {
  const { t } = useTranslation();
  const user = useUser();
  const queryClient = useQueryClient();
  const { profile, company } = useCompanyContext();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [language, setLang] = useState<"" | AppLanguage>("");
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name);
    setPhone(profile.phone ?? "");
    setLang(profile.language ?? "");
    setTheme(profile.theme);
  }, [profile]);

  async function save() {
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim(), phone: phone.trim() || null, language: language || null, theme })
      .eq("id", user.id);
    setBusy(false);
    if (error) return toast.error(errorMessage(t, error));
    await setLanguage(language || company?.default_language || "fr");
    applyTheme(theme);
    toast.success(t("common.saved"));
    await queryClient.invalidateQueries({ queryKey: qk.profile(user.id) });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("account.profile")}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="a-name" label={t("auth.fullName")}>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
          </FormField>
          <FormField id="a-phone" label={t("common.phone")}>
            <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="ltr-nums" />
          </FormField>
          <FormField id="a-lang" label={t("common.language")}>
            <NativeSelect value={language} onChange={(e) => setLang(e.target.value as "" | AppLanguage)}>
              <option value="">{t("account.useCompanyDefault", { language: t(`languages.${company?.default_language ?? "fr"}`) })}</option>
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {t(`languages.${l}`)}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField id="a-theme" label={t("account.theme")}>
            <NativeSelect value={theme} onChange={(e) => setTheme(e.target.value as ThemeMode)}>
              <option value="light">{t("account.themes.light")}</option>
              <option value="dark">{t("account.themes.dark")}</option>
              <option value="system">{t("account.themes.system")}</option>
            </NativeSelect>
          </FormField>
        </div>
        <div>
          <Button onClick={() => void save()} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : null}
            {t("common.save")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EmailCard() {
  const { t } = useTranslation();
  const user = useUser();
  const schema = z.object({ email: emailSchema(t) });
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { email: "" } });
  const onSubmit = form.handleSubmit(async ({ email }) => {
    const { error } = await supabase.auth.updateUser({ email }, { emailRedirectTo: `${window.location.origin}/account` });
    if (error) return void toast.error(errorMessage(t, error));
    toast.success(t("account.emailChangeSent", { email }));
    form.reset();
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("account.changeEmail")}</CardTitle>
        <CardDescription>{t("account.currentEmail", { email: user.email ?? "" })}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 sm:max-w-md" noValidate onSubmit={onSubmit}>
          <FormField
            id="a-email"
            label={t("account.newEmail")}
            error={form.formState.errors.email?.message}
            hint={t("account.emailChangeHint")}
          >
            <Input type="email" inputMode="email" {...form.register("email")} />
          </FormField>
          <div>
            <Button type="submit" variant="outline" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : null}
              {t("account.changeEmail")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function PasswordCard() {
  const { t } = useTranslation();
  const schema = newPasswordSchema(t);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { password: "", confirmPassword: "" } });
  const onSubmit = form.handleSubmit(async ({ password }) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return void toast.error(errorMessage(t, error));
    toast.success(t("auth.passwordUpdated"));
    form.reset();
  });
  const { errors, isSubmitting } = form.formState;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("account.changePassword")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 sm:max-w-md" noValidate onSubmit={onSubmit}>
          <FormField id="a-pw" label={t("auth.newPassword")} error={errors.password?.message}>
            <Input type="password" autoComplete="new-password" {...form.register("password")} />
          </FormField>
          <FormField id="a-pw2" label={t("auth.confirmPassword")} error={errors.confirmPassword?.message}>
            <Input type="password" autoComplete="new-password" {...form.register("confirmPassword")} />
          </FormField>
          <div>
            <Button type="submit" variant="outline" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : null}
              {t("account.changePassword")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function AccountPage() {
  const { t } = useTranslation();
  return (
    <>
      <PageHeader title={t("account.title")} />
      <div className="grid gap-4">
        <ProfileCard />
        <EmailCard />
        <PasswordCard />
      </div>
    </>
  );
}
