import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ClipboardCheck, FileDown } from "lucide-react";
import { toast } from "sonner";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TabBar } from "@/components/common/Tabs";
import { CrudPage } from "@/components/crud/CrudPage";
import type { CrudConfig } from "@/components/crud/types";
import { useCurrentCompany } from "@/features/companies/CompanyProvider";
import { useProject } from "@/features/projects/ProjectLayout";
import { currentLanguage } from "@/i18n";
import { errorMessage } from "@/lib/errors";
import { formatDate, todayIso } from "@/lib/format";
import { makePdfContext, exportTablePdf } from "@/lib/pdf/export";
import { supabase } from "@/lib/supabase";
import type { RowOf } from "@/lib/db";
import { cn } from "@/lib/utils";
import { inspectionOutcome, mergeResults, type CheckResult, type ChecklistItem, type ResultRow } from "./checklist";

const INSP_BADGE: Record<string, BadgeProps["variant"]> = { draft: "secondary", passed: "success", failed: "destructive" };
const SEV_BADGE: Record<string, BadgeProps["variant"]> = { low: "secondary", medium: "accent", high: "warning", critical: "destructive" };
const ISSUE_BADGE: Record<string, BadgeProps["variant"]> = {
  open: "warning",
  in_progress: "accent",
  resolved: "success",
  closed: "secondary",
};

export function QualityPage() {
  const { t } = useTranslation();
  const [tab, setTab] = React.useState<"inspections" | "safety">("inspections");
  return (
    <div className="grid gap-3">
      <h2 className="text-lg font-semibold">{t("quality.title")}</h2>
      <TabBar
        tabs={[
          { value: "inspections", label: t("quality.tabs.inspections") },
          { value: "safety", label: t("quality.tabs.safety") },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "inspections" ? <Inspections /> : <Safety />}
    </div>
  );
}

function Inspections() {
  const { t } = useTranslation();
  const { company, role } = useCurrentCompany();
  const { projectId, currency } = useProject();
  const [checking, setChecking] = React.useState<RowOf<"inspections"> | null>(null);
  const canWrite = ["owner", "admin", "project_manager", "site_foreman"].includes(role);
  const config: CrudConfig<"inspections"> = {
    table: "inspections",
    scope: "project",
    title: t("quality.tabs.inspections"),
    singular: t("quality.inspection"),
    emptyTitle: t("quality.noInspections"),
    emptyHint: t("quality.noInspectionsHint"),
    canWrite,
    searchColumns: ["title", "location", "notes"],
    sortable: ["inspection_date", "title", "status"],
    defaultSort: { id: "inspection_date", desc: true },
    filters: [
      {
        name: "status",
        label: t("issues.allStatuses"),
        options: ["draft", "passed", "failed"].map((v) => ({ value: v, label: t(`quality.statuses.${v}`) })),
      },
    ],
    columns: [
      {
        id: "inspection_date",
        header: t("common.date"),
        sortable: true,
        cell: (r) => <span className="num">{formatDate(r.inspection_date)}</span>,
        exportValue: (r) => formatDate(r.inspection_date),
      },
      {
        id: "title",
        header: t("quality.inspection"),
        sortable: true,
        cell: (r) => <span className="font-medium">{r.title}</span>,
        exportValue: (r) => r.title,
      },
      { id: "location", header: t("issues.location"), cell: (r) => r.location ?? "—", exportValue: (r) => r.location },
      {
        id: "status",
        header: t("common.status"),
        sortable: true,
        cell: (r) => <Badge variant={INSP_BADGE[r.status]}>{t(`quality.statuses.${r.status}`)}</Badge>,
        exportValue: (r) => t(`quality.statuses.${r.status}`),
      },
    ],
    fields: [
      {
        name: "template_id",
        label: t("quality.template"),
        type: "relation",
        span: 2,
        relation: { table: "checklist_templates", label: (r) => String(r.name), order: "name", allowEmpty: true },
      },
      { name: "title", label: t("quality.inspection"), type: "text", required: true, span: 2, hint: t("quality.inspectionHint") },
      { name: "inspection_date", label: t("common.date"), type: "date", required: true, defaultValue: todayIso(company.timezone) },
      { name: "location", label: t("issues.location"), type: "text" },
      { name: "notes", label: t("common.notes"), type: "textarea" },
    ],
    rowActions: (r) => (
      <Button variant="ghost" size="sm" onClick={() => setChecking(r)}>
        <ClipboardCheck className="size-4" aria-hidden />
        {t("quality.check")}
      </Button>
    ),
  };
  return (
    <>
      <CrudPage config={config} projectId={projectId} currency={currency} embedded />
      {checking ? <CheckDialog inspection={checking} readOnly={!canWrite} onClose={() => setChecking(null)} /> : null}
    </>
  );
}

function CheckDialog({ inspection, readOnly, onClose }: { inspection: RowOf<"inspections">; readOnly: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const qc = useQueryClient();
  const { company, companyId } = useCurrentCompany();
  const { project } = useProject();
  const tpl = useQuery({
    queryKey: ["company", companyId, "checklist", inspection.template_id],
    enabled: Boolean(inspection.template_id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("checklist_templates")
        .select("items")
        .eq("id", inspection.template_id as string)
        .maybeSingle();
      if (error) throw error;
      return (data?.items ?? []) as ChecklistItem[];
    },
  });
  const previous = (Array.isArray(inspection.results) ? inspection.results : []) as ResultRow[];
  const [rows, setRows] = React.useState<ResultRow[]>(previous);
  React.useEffect(() => {
    if (tpl.data) setRows(mergeResults(tpl.data, previous));
  }, [tpl.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const outcome = inspectionOutcome(rows);
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("inspections").update({ results: rows, status: outcome }).eq("id", inspection.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("common.saved"));
      void qc.invalidateQueries({ queryKey: ["company", companyId] });
      onClose();
    },
    onError: (e) => toast.error(errorMessage(t, e)),
  });
  const setRow = (i: number, patch: Partial<ResultRow>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  async function pdf() {
    const ctx = await makePdfContext({
      company,
      lang,
      currency: "DJF",
      title: (tt) => tt("quality.inspectionReport"),
      subtitle: `${project.code} ${project.name}`,
      meta: (tt) => [
        [tt("quality.inspection"), inspection.title],
        [tt("common.date"), formatDate(inspection.inspection_date)],
        [tt("issues.location"), inspection.location ?? "—"],
        [tt("common.status"), tt(`quality.statuses.${outcome}`)],
      ],
    });
    await exportTablePdf(
      ctx,
      [
        {
          columns: [
            { label: ctx.t("quality.point"), width: "55%" },
            { label: ctx.t("quality.result"), width: "15%" },
            { label: ctx.t("common.notes"), width: "30%" },
          ],
          rows: rows.map((r) => ({ cells: [r.label, r.result ? ctx.t(`quality.results.${r.result}`) : "—", r.note] })),
        },
      ],
      {
        fileName: `${project.code}_${inspection.title}`,
        note: inspection.notes ?? undefined,
        signatures: [ctx.t("quality.signInspector"), ctx.t("quality.signContractor")],
      },
    );
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {inspection.title}
            <Badge variant={INSP_BADGE[outcome]}>{t(`quality.statuses.${outcome}`)}</Badge>
          </DialogTitle>
        </DialogHeader>
        {!inspection.template_id && rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("quality.noTemplateHint")}</p>
        ) : null}
        <div className="grid gap-2">
          {rows.map((r, i) => (
            <div key={r.label} className="grid gap-1 rounded-md border p-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium">{r.label}</span>
                <div role="radiogroup" aria-label={r.label} className="flex rounded-md border p-0.5">
                  {(["pass", "fail", "na"] as CheckResult[]).map((v) => (
                    <button
                      key={v}
                      type="button"
                      role="radio"
                      aria-checked={r.result === v}
                      disabled={readOnly}
                      onClick={() => setRow(i, { result: v })}
                      className={cn(
                        "min-h-9 rounded px-3 text-sm",
                        r.result === v
                          ? v === "pass"
                            ? "bg-success text-white"
                            : v === "fail"
                              ? "bg-destructive text-white"
                              : "bg-muted font-semibold"
                          : "hover:bg-muted",
                      )}
                    >
                      {t(`quality.results.${v}`)}
                    </button>
                  ))}
                </div>
              </div>
              <Input
                value={r.note}
                disabled={readOnly}
                placeholder={t("common.notes")}
                aria-label={`${t("common.notes")} — ${r.label}`}
                onChange={(e) => setRow(i, { note: e.target.value })}
              />
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => void pdf().catch((e) => toast.error(errorMessage(t, e)))} disabled={!rows.length}>
            <FileDown className="size-4" aria-hidden />
            PDF
          </Button>
          {!readOnly ? (
            <Button onClick={() => save.mutate()} disabled={save.isPending || !rows.length}>
              {t("common.save")}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Safety() {
  const { t } = useTranslation();
  const { company, role } = useCurrentCompany();
  const { projectId, currency } = useProject();
  const kinds = ["unsafe_act", "unsafe_condition", "near_miss", "good_practice"].map((v) => ({
    value: v,
    label: t(`quality.safetyKinds.${v}`),
  }));
  const severities = ["low", "medium", "high", "critical"].map((v) => ({ value: v, label: t(`site.severities.${v}`) }));
  const statuses = ["open", "in_progress", "resolved", "closed"].map((v) => ({ value: v, label: t(`issues.statuses.${v}`) }));
  const config: CrudConfig<"safety_observations"> = {
    table: "safety_observations",
    scope: "project",
    title: t("quality.tabs.safety"),
    singular: t("quality.observation"),
    emptyTitle: t("quality.noObservations"),
    emptyHint: t("quality.noObservationsHint"),
    canWrite: ["owner", "admin", "project_manager", "site_foreman", "storekeeper"].includes(role),
    searchColumns: ["description", "action"],
    sortable: ["observed_on", "kind", "severity", "status"],
    defaultSort: { id: "observed_on", desc: true },
    filters: [
      { name: "kind", label: t("quality.allKinds"), options: kinds },
      { name: "status", label: t("issues.allStatuses"), options: statuses },
    ],
    columns: [
      {
        id: "observed_on",
        header: t("common.date"),
        sortable: true,
        cell: (r) => <span className="num">{formatDate(r.observed_on)}</span>,
        exportValue: (r) => formatDate(r.observed_on),
      },
      {
        id: "kind",
        header: t("quality.kind"),
        sortable: true,
        cell: (r) => t(`quality.safetyKinds.${r.kind}`),
        exportValue: (r) => t(`quality.safetyKinds.${r.kind}`),
      },
      {
        id: "description",
        header: t("common.description"),
        cell: (r) => <span className="line-clamp-2">{r.description}</span>,
        exportValue: (r) => r.description,
      },
      {
        id: "severity",
        header: t("issues.priority"),
        sortable: true,
        cell: (r) => <Badge variant={SEV_BADGE[r.severity]}>{t(`site.severities.${r.severity}`)}</Badge>,
        exportValue: (r) => t(`site.severities.${r.severity}`),
      },
      {
        id: "status",
        header: t("common.status"),
        sortable: true,
        cell: (r) => <Badge variant={ISSUE_BADGE[r.status]}>{t(`issues.statuses.${r.status}`)}</Badge>,
        exportValue: (r) => t(`issues.statuses.${r.status}`),
      },
    ],
    fields: [
      { name: "observed_on", label: t("common.date"), type: "date", required: true, defaultValue: todayIso(company.timezone) },
      { name: "kind", label: t("quality.kind"), type: "select", options: kinds, required: true, defaultValue: "unsafe_condition" },
      { name: "severity", label: t("issues.priority"), type: "select", options: severities, required: true, defaultValue: "low" },
      { name: "status", label: t("common.status"), type: "select", options: statuses, required: true, defaultValue: "open" },
      { name: "description", label: t("common.description"), type: "textarea", required: true },
      { name: "action", label: t("quality.action"), type: "textarea" },
      { name: "photo_path", label: t("site.photo"), type: "file", module: "safety", accept: "image/*" },
    ],
  };
  return <CrudPage config={config} projectId={projectId} currency={currency} embedded />;
}
