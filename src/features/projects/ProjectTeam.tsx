import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Loader2, UserMinus, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/common/States";
import { useCurrentCompany } from "@/features/companies/CompanyProvider";
import { fetchMemberOptions } from "@/features/members/api";
import { qk } from "@/lib/queryKeys";
import { errorMessage } from "@/lib/errors";
import { addProjectMember, fetchProjectMembers, removeProjectMember } from "./api";

export function ProjectTeam({ projectId, readOnly }: { projectId: string; readOnly: boolean }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { companyId } = useCurrentCompany();
  const [selected, setSelected] = useState("");

  const members = useQuery({ queryKey: qk.projectMembers(companyId, projectId), queryFn: () => fetchProjectMembers(companyId, projectId) });
  const options = useQuery({ queryKey: qk.memberOptions(companyId), queryFn: () => fetchMemberOptions(companyId), enabled: !readOnly });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["company", companyId] });

  const add = useMutation({
    mutationFn: () => addProjectMember(companyId, projectId, selected),
    onSuccess: async () => {
      setSelected("");
      await refresh();
    },
    onError: (e) => toast.error(errorMessage(t, e)),
  });
  const remove = useMutation({
    mutationFn: (memberId: string) => removeProjectMember(memberId),
    onSuccess: refresh,
    onError: (e) => toast.error(errorMessage(t, e)),
  });

  const assigned = new Set((members.data ?? []).map((m) => m.user_id));
  const candidates = (options.data ?? []).filter((o) => !assigned.has(o.user_id) && o.role !== "owner" && o.role !== "admin");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("projects.tabs.team")}</CardTitle>
        <CardDescription>{t("projects.teamHint")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {!readOnly ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <NativeSelect
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              aria-label={t("projects.addMember")}
              className="sm:w-80"
            >
              <option value="">{t("projects.chooseMember")}</option>
              {candidates.map((c) => (
                <option key={c.user_id} value={c.user_id}>
                  {c.full_name || c.email} — {t(`roles.${c.role}`)}
                </option>
              ))}
            </NativeSelect>
            <Button onClick={() => add.mutate()} disabled={!selected || add.isPending}>
              {add.isPending ? <Loader2 className="animate-spin" /> : <UserPlus />} {t("projects.addMember")}
            </Button>
          </div>
        ) : null}
        {members.isLoading ? (
          <Skeleton className="h-24" />
        ) : members.error ? (
          <ErrorState message={errorMessage(t, members.error)} onRetry={() => void members.refetch()} />
        ) : (members.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("projects.noTeam")}</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {(members.data ?? []).map((m) => (
              <li key={m.id} className="flex items-center gap-3 p-3">
                <Avatar name={m.full_name || m.email} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{m.full_name || m.email}</p>
                  <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                </div>
                {m.role ? <Badge variant="secondary">{t(`roles.${m.role}`)}</Badge> : null}
                {!readOnly ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("projects.removeMember")}
                    onClick={() => remove.mutate(m.id)}
                    disabled={remove.isPending}
                  >
                    <UserMinus />
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">{t("projects.ownersSeeAll")}</p>
      </CardContent>
    </Card>
  );
}
