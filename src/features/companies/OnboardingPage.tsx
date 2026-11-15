import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { Building2, Check, Loader2, LogOut, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { qk } from "@/lib/queryKeys";
import { errorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { currentLanguage } from "@/i18n";
import { useUser, useAuth } from "@/features/auth/AuthProvider";
import { useCompanyContext } from "./CompanyProvider";
import { Logo } from "@/components/common/Logo";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { FormField } from "@/components/ui/form-field";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

/** Shown to a signed-in user who has no company yet, and reachable from the company switcher. */
export function OnboardingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useUser();
  const { signOut } = useAuth();
  const { memberships, refetch } = useCompanyContext();
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);

  const invitations = useQuery({
    queryKey: qk.invitationsForMe(user.id),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("my_invitations");
      if (error) throw error;
      return data ?? [];
    },
  });

  const schema = z.object({
    name: z.string().trim().min(1, t("validation.required")).max(200),
    country: z.enum(["DJ", "ET"]),
    currency: z.enum(["DJF", "ETB", "USD"]),
  });
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", country: "DJ", currency: "DJF" },
  });

  async function afterJoin() {
    await queryClient.invalidateQueries({ queryKey: qk.profile(user.id) });
    await queryClient.invalidateQueries({ queryKey: qk.memberships(user.id) });
    refetch();
    navigate("/", { replace: true });
  }

  const create = useMutation({
    mutationFn: async (v: z.infer<typeof schema>) => {
      const { error } = await supabase.rpc("create_company", {
        p_name: v.name,
        p_country: v.country,
        p_currency: v.currency,
        p_language: currentLanguage(),
      });
      if (error) throw error;
    },
    onSuccess: afterJoin,
    onError: (e) => toast.error(errorMessage(t, e)),
  });

  async function respond(id: string, accept: boolean) {
    setBusyId(id);
    try {
      const { error } = accept
        ? await supabase.rpc("accept_invitation", { p_invitation_id: id })
        : await supabase.rpc("decline_invitation", { p_invitation_id: id });
      if (error) throw error;
      if (accept) {
        toast.success(t("onboarding.joined"));
        await afterJoin();
      } else {
        await invitations.refetch();
      }
    } catch (e) {
      toast.error(errorMessage(t, e));
    } finally {
      setBusyId(null);
    }
  }

  const { errors } = form.formState;
  return (
    <div className="min-h-full bg-muted/40">
      <header className="flex items-center justify-between p-3">
        <Logo plate />
        <div className="flex items-center gap-1">
          <LanguageSwitcher />
          {memberships.length > 0 ? (
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
              {t("common.back")}
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => void signOut()}>
              <LogOut /> {t("auth.signOut")}
            </Button>
          )}
        </div>
      </header>
      <main className="mx-auto grid max-w-2xl gap-4 px-4 pb-12">
        <div>
          <h1 className="text-xl font-semibold">{t("onboarding.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("onboarding.subtitle")}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("onboarding.pendingInvitations")}</CardTitle>
          </CardHeader>
          <CardContent>
            {invitations.isLoading ? (
              <Skeleton className="h-16" />
            ) : invitations.error ? (
              <p className="text-sm text-destructive">{errorMessage(t, invitations.error)}</p>
            ) : (invitations.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("onboarding.noInvitations")}</p>
            ) : (
              <ul className="grid gap-2">
                {(invitations.data ?? []).map((inv) => (
                  <li key={inv.id} className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center">
                    <div className="flex-1">
                      <p className="font-medium">{inv.company_name}</p>
                      <p className="text-xs text-muted-foreground">
                        <Badge variant="secondary" className="me-2">
                          {t(`roles.${inv.role}`)}
                        </Badge>
                        {inv.invited_by_name ? t("onboarding.invitedBy", { name: inv.invited_by_name }) : null} ·{" "}
                        {t("members.expires", { date: formatDate(inv.expires_at) })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" disabled={busyId !== null} onClick={() => void respond(inv.id, false)}>
                        <X /> {t("common.decline")}
                      </Button>
                      <Button disabled={busyId !== null} onClick={() => void respond(inv.id, true)}>
                        {busyId === inv.id ? <Loader2 className="animate-spin" /> : <Check />} {t("common.accept")}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="size-4" aria-hidden /> {t("onboarding.createCompany")}
            </CardTitle>
            <CardDescription>{t("onboarding.createCompanyHint")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" noValidate onSubmit={form.handleSubmit((v) => create.mutate(v))}>
              <FormField id="company-name" label={t("auth.companyName")} error={errors.name?.message} required>
                <Input {...form.register("name")} />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField id="company-country" label={t("common.country")}>
                  <NativeSelect
                    {...form.register("country", {
                      onChange: (e: { target: { value: string } }) => form.setValue("currency", e.target.value === "ET" ? "ETB" : "DJF"),
                    })}
                  >
                    <option value="DJ">{t("countries.DJ")}</option>
                    <option value="ET">{t("countries.ET")}</option>
                  </NativeSelect>
                </FormField>
                <FormField id="company-currency" label={t("companies.defaultCurrency")}>
                  <NativeSelect {...form.register("currency")}>
                    <option value="DJF">{t("currencies.DJF")}</option>
                    <option value="ETB">{t("currencies.ETB")}</option>
                    <option value="USD">{t("currencies.USD")}</option>
                  </NativeSelect>
                </FormField>
              </div>
              <Button type="submit" size="touch" disabled={create.isPending}>
                {create.isPending ? <Loader2 className="animate-spin" /> : null}
                {t("onboarding.createCompany")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
