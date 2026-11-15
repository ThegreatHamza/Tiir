import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, UserX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { NativeSelect } from "@/components/ui/native-select";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useCurrentCompany } from "@/features/companies/CompanyProvider";
import { useUser } from "@/features/auth/AuthProvider";
import { assignableRoles, can, type AppRole } from "@/lib/roles";
import { errorMessage } from "@/lib/errors";
import { removeMember, setMemberProjects, updateMember, type MemberRow } from "./api";
import { ProjectPicker } from "./ProjectPicker";

export function MemberEditDialog({
  member,
  onOpenChange,
  onSaved,
}: {
  member: MemberRow | null;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const user = useUser();
  const { companyId, role: myRole } = useCurrentCompany();
  const [role, setRole] = useState<AppRole>("site_foreman");
  const [status, setStatus] = useState<"active" | "disabled">("active");
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => {
    if (member) {
      setRole(member.role ?? "site_foreman");
      setStatus(member.status ?? "active");
      setProjectIds(member.project_ids ?? []);
    }
  }, [member]);

  if (!member) return null;
  const isSelf = member.user_id === user.id;
  const mayManage = !isSelf && member.role !== null && can.manageRole(myRole, member.role);
  const roles = assignableRoles(myRole);
  const seesAll = role === "owner" || role === "admin";

  async function save() {
    if (!member?.id || !member.user_id) return;
    setSaving(true);
    try {
      if (mayManage && (role !== member.role || status !== member.status)) await updateMember(member.id, { role, status });
      if (!seesAll) await setMemberProjects(companyId, member.user_id, projectIds);
      toast.success(t("common.saved"));
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(errorMessage(t, e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Dialog open={Boolean(member)} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{member.full_name || member.email}</DialogTitle>
            <DialogDescription>{member.email}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField
                id="m-role"
                label={t("common.role")}
                hint={isSelf ? t("members.cannotEditSelf") : !mayManage ? t("members.onlyOwner") : undefined}
              >
                <NativeSelect value={role} onChange={(e) => setRole(e.target.value as AppRole)} disabled={!mayManage}>
                  {(mayManage ? roles : [role]).map((r) => (
                    <option key={r} value={r}>
                      {t(`roles.${r}`)}
                    </option>
                  ))}
                </NativeSelect>
              </FormField>
              <FormField id="m-status" label={t("common.status")}>
                <NativeSelect value={status} onChange={(e) => setStatus(e.target.value as "active" | "disabled")} disabled={!mayManage}>
                  <option value="active">{t("members.statuses.active")}</option>
                  <option value="disabled">{t("members.statuses.disabled")}</option>
                </NativeSelect>
              </FormField>
            </div>
            {seesAll ? (
              <p className="text-sm text-muted-foreground">{t("projects.ownersSeeAll")}</p>
            ) : (
              <div className="grid gap-1.5">
                <Label>{t("members.assignProjects")}</Label>
                <ProjectPicker companyId={companyId} value={projectIds} onChange={setProjectIds} />
              </div>
            )}
          </div>
          <DialogFooter className="sm:justify-between">
            {mayManage ? (
              <Button variant="ghost" className="text-destructive" onClick={() => setConfirmRemove(true)}>
                <UserX /> {t("members.remove")}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={() => void save()} disabled={saving}>
                {saving ? <Loader2 className="animate-spin" /> : null}
                {t("common.save")}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        destructive
        title={t("members.removeTitle")}
        description={t("members.removeBody", { name: member.full_name || member.email })}
        confirmLabel={t("members.remove")}
        onConfirm={async () => {
          try {
            if (member.id) await removeMember(member.id);
            toast.success(t("members.removed"));
            onSaved();
            onOpenChange(false);
          } catch (e) {
            toast.error(errorMessage(t, e));
          }
        }}
      />
    </>
  );
}
