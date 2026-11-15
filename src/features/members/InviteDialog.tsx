import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Label } from "@/components/ui/label";
import { useCurrentCompany } from "@/features/companies/CompanyProvider";
import { emailSchema } from "@/features/auth/schemas";
import { assignableRoles, type AppRole } from "@/lib/roles";
import { errorMessage } from "@/lib/errors";
import { currentLanguage } from "@/i18n";
import { inviteMember } from "./api";
import { ProjectPicker } from "./ProjectPicker";

export function InviteDialog({
  open,
  onOpenChange,
  onInvited,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onInvited: () => void;
}) {
  const { t } = useTranslation();
  const { companyId, role } = useCurrentCompany();
  const roles = assignableRoles(role);
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const schema = z.object({ email: emailSchema(t), role: z.string() });
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { email: "", role: "site_foreman" } });
  const chosenRole = form.watch("role") as AppRole;
  const seesAll = chosenRole === "owner" || chosenRole === "admin";

  const onSubmit = form.handleSubmit(async (v) => {
    try {
      const res = await inviteMember({
        companyId,
        email: v.email,
        role: v.role as AppRole,
        projectIds: seesAll ? [] : projectIds,
        language: currentLanguage(),
      });
      if (res.delivery === "email") toast.success(t("members.inviteSent", { email: v.email }));
      else if (res.delivery === "in_app") toast.success(t("members.inviteInApp", { email: v.email }));
      else toast.warning(t("members.inviteEmailFailed", { email: v.email }));
      form.reset({ email: "", role: v.role });
      setProjectIds([]);
      onInvited();
      onOpenChange(false);
    } catch (e) {
      toast.error(errorMessage(t, e));
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("members.inviteTitle")}</DialogTitle>
          <DialogDescription>{t("members.inviteHint")}</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" noValidate onSubmit={onSubmit}>
          <FormField id="inv-email" label={t("auth.email")} error={form.formState.errors.email?.message} required>
            <Input type="email" inputMode="email" autoComplete="off" {...form.register("email")} />
          </FormField>
          <FormField id="inv-role" label={t("common.role")} hint={t(`roles.hints.${chosenRole}`)}>
            <NativeSelect {...form.register("role")}>
              {roles.map((r) => (
                <option key={r} value={r}>
                  {t(`roles.${r}`)}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          {seesAll ? (
            <p className="text-sm text-muted-foreground">{t("projects.ownersSeeAll")}</p>
          ) : (
            <div className="grid gap-1.5">
              <Label>{t("members.assignProjects")}</Label>
              <ProjectPicker companyId={companyId} value={projectIds} onChange={setProjectIds} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : null}
              {t("members.sendInvite")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
