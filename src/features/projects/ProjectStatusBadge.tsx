import { useTranslation } from "react-i18next";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import type { ProjectStatus } from "./api";

const VARIANT: Record<ProjectStatus, BadgeProps["variant"]> = {
  draft: "secondary",
  tender: "accent",
  active: "success",
  on_hold: "warning",
  completed: "default",
  cancelled: "destructive",
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus | null }) {
  const { t } = useTranslation();
  if (!status) return null;
  return <Badge variant={VARIANT[status]}>{t(`projects.statuses.${status}`)}</Badge>;
}
