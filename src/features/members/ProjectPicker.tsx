import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchProjectOptions } from "@/features/projects/api";
import { qk } from "@/lib/queryKeys";

export function ProjectPicker({ companyId, value, onChange }: { companyId: string; value: string[]; onChange: (ids: string[]) => void }) {
  const { t } = useTranslation();
  const query = useQuery({ queryKey: qk.projectOptions(companyId), queryFn: () => fetchProjectOptions(companyId) });
  if (query.isLoading) return <Skeleton className="h-20" />;
  const projects = query.data ?? [];
  if (projects.length === 0) return <p className="text-sm text-muted-foreground">{t("members.noProjectsYet")}</p>;
  const selected = new Set(value);
  return (
    <fieldset className="max-h-56 overflow-y-auto rounded-md border p-2">
      <legend className="sr-only">{t("members.assignProjects")}</legend>
      {projects.map((p) => (
        <label key={p.id} className="flex min-h-10 items-center gap-3 rounded px-2 hover:bg-muted">
          <Checkbox
            checked={selected.has(p.id)}
            onCheckedChange={(on) => {
              const next = new Set(selected);
              if (on === true) next.add(p.id);
              else next.delete(p.id);
              onChange([...next]);
            }}
          />
          <span className="font-mono text-xs text-muted-foreground ltr-nums">{p.code}</span>
          <span className="truncate">{p.name}</span>
        </label>
      ))}
    </fieldset>
  );
}
