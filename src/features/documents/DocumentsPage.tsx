import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Download, FilePlus2, History } from "lucide-react";
import { toast } from "sonner";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TabBar } from "@/components/common/Tabs";
import { CrudPage } from "@/components/crud/CrudPage";
import { FileField } from "@/components/crud/FileField";
import type { CrudConfig } from "@/components/crud/types";
import { useCurrentCompany } from "@/features/companies/CompanyProvider";
import { useProject } from "@/features/projects/ProjectLayout";
import { errorMessage } from "@/lib/errors";
import { formatDate, formatDateTime, todayIso } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { openFile } from "@/lib/files";
import type { RowOf } from "@/lib/db";

const WRITERS = ["owner", "admin", "project_manager", "estimator", "site_foreman"];
const RFI_BADGE: Record<string, BadgeProps["variant"]> = { open: "warning", answered: "accent", closed: "success" };
const fileName = (path: string) => path.split("/").pop()?.replace(/^\d+-/, "") ?? path;

export function DocumentsPage() {
  const { t } = useTranslation();
  const [tab, setTab] = React.useState<"documents" | "drawings" | "rfis">("documents");
  return (
    <div className="grid gap-3">
      <h2 className="text-lg font-semibold">{t("documents.title")}</h2>
      <TabBar
        tabs={(["documents", "drawings", "rfis"] as const).map((v) => ({ value: v, label: t(`documents.tabs.${v}`) }))}
        value={tab}
        onChange={setTab}
      />
      {tab === "documents" ? <Documents /> : tab === "drawings" ? <Drawings /> : <Rfis />}
    </div>
  );
}

function Documents() {
  const { t } = useTranslation();
  const { role } = useCurrentCompany();
  const { projectId, currency } = useProject();
  const [versionOf, setVersionOf] = React.useState<RowOf<"documents_current"> | null>(null);
  const [historyOf, setHistoryOf] = React.useState<RowOf<"documents_current"> | null>(null);
  const canWrite = WRITERS.includes(role);
  const config: CrudConfig<"documents", "documents_current"> = {
    table: "documents",
    view: "documents_current",
    scope: "project",
    title: t("documents.tabs.documents"),
    singular: t("documents.singular"),
    emptyTitle: t("documents.empty"),
    emptyHint: t("documents.emptyHint"),
    canWrite,
    searchColumns: ["title", "folder", "file_name"],
    sortable: ["folder", "title", "updated_at"],
    defaultSort: { id: "folder", desc: false },
    filters: [
      {
        name: "shared",
        column: "shared_with_client",
        label: t("documents.allDocuments"),
        options: [{ value: "true", label: t("documents.sharedOnly") }],
      },
    ],
    columns: [
      {
        id: "folder",
        header: t("documents.folder"),
        sortable: true,
        cell: (r) => <span className="text-muted-foreground">{r.folder || "/"}</span>,
        exportValue: (r) => r.folder,
      },
      {
        id: "title",
        header: t("common.title"),
        sortable: true,
        cell: (r) => (
          <div className="grid">
            <span className="font-medium">{r.title}</span>
            <span className="text-xs text-muted-foreground">{r.file_name || fileName(r.file_path)}</span>
          </div>
        ),
        exportValue: (r) => r.title,
      },
      {
        id: "version",
        header: t("documents.version"),
        align: "end",
        cell: (r) => <span className="num">v{r.version}</span>,
        exportValue: (r) => r.version,
      },
      {
        id: "shared",
        header: t("documents.client"),
        cell: (r) => (r.shared_with_client ? <Badge variant="accent">{t("documents.shared")}</Badge> : null),
        exportValue: (r) => (r.shared_with_client ? t("common.yes") : ""),
      },
      {
        id: "updated_at",
        header: t("documents.updated"),
        sortable: true,
        cell: (r) => <span className="num">{formatDate(r.updated_at)}</span>,
        exportValue: (r) => formatDate(r.updated_at),
      },
    ],
    fields: [
      { name: "title", label: t("common.title"), type: "text", required: true, span: 2 },
      { name: "folder", label: t("documents.folder"), type: "text", hint: t("documents.folderHint") },
      { name: "shared_with_client", label: t("documents.shareWithClient"), type: "checkbox", defaultValue: false },
      { name: "file_path", label: t("documents.file"), type: "file", module: "documents", compress: false, required: true, span: 2 },
      { name: "notes", label: t("common.notes"), type: "textarea" },
    ],
    toPayload: (v) => ({ ...v, folder: String(v.folder ?? "").trim(), file_name: fileName(String(v.file_path ?? "")) }),
    rowActions: (r) => (
      <>
        <Button variant="ghost" size="icon" className="size-8" aria-label={t("files.open")} onClick={() => void openFile(r.file_path)}>
          <Download />
        </Button>
        {r.version_count && r.version_count > 1 ? (
          <Button variant="ghost" size="icon" className="size-8" aria-label={t("documents.history")} onClick={() => setHistoryOf(r)}>
            <History />
          </Button>
        ) : null}
        {canWrite ? (
          <Button variant="ghost" size="icon" className="size-8" aria-label={t("documents.newVersion")} onClick={() => setVersionOf(r)}>
            <FilePlus2 />
          </Button>
        ) : null}
      </>
    ),
  };
  return (
    <>
      <CrudPage config={config} projectId={projectId} currency={currency} embedded />
      {versionOf ? <NewVersionDialog doc={versionOf} onClose={() => setVersionOf(null)} /> : null}
      {historyOf ? <HistoryDialog doc={historyOf} onClose={() => setHistoryOf(null)} /> : null}
    </>
  );
}

function NewVersionDialog({ doc, onClose }: { doc: RowOf<"documents_current">; onClose: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { companyId } = useCurrentCompany();
  const [path, setPath] = React.useState("");
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("documents").insert({
        company_id: companyId,
        project_id: doc.project_id,
        document_key: doc.document_key,
        folder: doc.folder,
        title: doc.title,
        version: doc.version + 1,
        file_path: path,
        file_name: fileName(path),
        shared_with_client: doc.shared_with_client,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("common.saved"));
      void qc.invalidateQueries({ queryKey: ["company", companyId] });
      onClose();
    },
    onError: (e) => toast.error(errorMessage(t, e)),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("documents.newVersionOf", { title: doc.title, version: doc.version + 1 })}</DialogTitle>
        </DialogHeader>
        <FileField value={path} onChange={setPath} companyId={companyId} projectId={doc.project_id} module="documents" compress={false} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={() => save.mutate()} disabled={!path || save.isPending}>
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HistoryDialog({ doc, onClose }: { doc: RowOf<"documents_current">; onClose: () => void }) {
  const { t } = useTranslation();
  const q = useQuery({
    queryKey: ["document-history", doc.document_key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("id, version, file_path, file_name, created_at")
        .eq("document_key", doc.document_key)
        .is("deleted_at", null)
        .order("version", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("documents.historyOf", { title: doc.title })}</DialogTitle>
        </DialogHeader>
        <ul className="grid gap-1">
          {(q.data ?? []).map((v) => (
            <li key={v.id} className="flex items-center justify-between gap-2 border-b py-1 text-sm">
              <span>
                <span className="font-medium num">v{v.version}</span> · {v.file_name || fileName(v.file_path)}
                <span className="ms-2 text-xs text-muted-foreground num">{formatDateTime(v.created_at)}</span>
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label={t("files.open")}
                onClick={() => void openFile(v.file_path)}
              >
                <Download />
              </Button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

function Drawings() {
  const { t } = useTranslation();
  const { company, role } = useCurrentCompany();
  const { projectId, currency } = useProject();
  const config: CrudConfig<"drawing_revisions", "drawing_revision_list"> = {
    table: "drawing_revisions",
    view: "drawing_revision_list",
    scope: "project",
    title: t("documents.tabs.drawings"),
    singular: t("documents.drawing"),
    emptyTitle: t("documents.noDrawings"),
    emptyHint: t("documents.noDrawingsHint"),
    canWrite: WRITERS.includes(role),
    searchColumns: ["drawing_number", "title", "discipline"],
    sortable: ["drawing_number", "issued_date", "revision"],
    defaultSort: { id: "drawing_number", desc: false },
    filters: [
      {
        name: "current",
        column: "is_current",
        label: t("documents.allRevisions"),
        options: [{ value: "true", label: t("documents.currentOnly") }],
      },
    ],
    columns: [
      {
        id: "drawing_number",
        header: t("documents.drawingNumber"),
        sortable: true,
        cell: (r) => <span className="font-medium num">{r.drawing_number}</span>,
        exportValue: (r) => r.drawing_number,
      },
      { id: "title", header: t("common.title"), cell: (r) => r.title, exportValue: (r) => r.title },
      { id: "discipline", header: t("documents.discipline"), cell: (r) => r.discipline ?? "—", exportValue: (r) => r.discipline },
      {
        id: "revision",
        header: t("documents.revision"),
        sortable: true,
        cell: (r) => (
          <span className="inline-flex items-center gap-1">
            <span className="num">{r.revision}</span>
            {r.is_current ? (
              <Badge variant="success">{t("documents.current")}</Badge>
            ) : (
              <Badge variant="secondary">{t("documents.superseded")}</Badge>
            )}
          </span>
        ),
        exportValue: (r) => r.revision,
      },
      {
        id: "issued_date",
        header: t("documents.issued"),
        sortable: true,
        cell: (r) => <span className="num">{formatDate(r.issued_date)}</span>,
        exportValue: (r) => formatDate(r.issued_date),
      },
    ],
    fields: [
      { name: "drawing_number", label: t("documents.drawingNumber"), type: "text", required: true },
      { name: "revision", label: t("documents.revision"), type: "text", required: true, defaultValue: "A" },
      { name: "title", label: t("common.title"), type: "text", required: true, span: 2 },
      { name: "discipline", label: t("documents.discipline"), type: "text", hint: t("documents.disciplineHint") },
      { name: "issued_date", label: t("documents.issued"), type: "date", required: true, defaultValue: todayIso(company.timezone) },
      { name: "file_path", label: t("documents.file"), type: "file", module: "drawings", compress: false, span: 2 },
      { name: "notes", label: t("common.notes"), type: "textarea" },
    ],
    rowActions: (r) =>
      r.file_path ? (
        <Button variant="ghost" size="icon" className="size-8" aria-label={t("files.open")} onClick={() => void openFile(r.file_path)}>
          <Download />
        </Button>
      ) : null,
  };
  return <CrudPage config={config} projectId={projectId} currency={currency} embedded />;
}

function Rfis() {
  const { t } = useTranslation();
  const { company, role } = useCurrentCompany();
  const { projectId, currency } = useProject();
  const today = todayIso(company.timezone);
  const statuses = ["open", "answered", "closed"].map((v) => ({ value: v, label: t(`documents.rfiStatuses.${v}`) }));
  const config: CrudConfig<"rfis"> = {
    table: "rfis",
    scope: "project",
    title: t("documents.tabs.rfis"),
    singular: t("documents.rfi"),
    emptyTitle: t("documents.noRfis"),
    emptyHint: t("documents.noRfisHint"),
    canWrite: WRITERS.includes(role),
    searchColumns: ["subject", "question", "response", "addressed_to"],
    sortable: ["number", "subject", "due_date", "status"],
    defaultSort: { id: "number", desc: true },
    filters: [{ name: "status", label: t("issues.allStatuses"), options: statuses }],
    columns: [
      { id: "number", header: "N°", sortable: true, cell: (r) => <span className="num">{r.number}</span>, exportValue: (r) => r.number },
      {
        id: "subject",
        header: t("documents.subject"),
        sortable: true,
        cell: (r) => <span className="font-medium">{r.subject}</span>,
        exportValue: (r) => r.subject,
      },
      { id: "addressed_to", header: t("documents.addressedTo"), cell: (r) => r.addressed_to ?? "—", exportValue: (r) => r.addressed_to },
      {
        id: "due_date",
        header: t("issues.dueDate"),
        sortable: true,
        cell: (r) => (
          <span className={r.status === "open" && r.due_date && r.due_date < today ? "font-semibold text-destructive num" : "num"}>
            {formatDate(r.due_date)}
          </span>
        ),
        exportValue: (r) => formatDate(r.due_date),
      },
      {
        id: "status",
        header: t("common.status"),
        sortable: true,
        cell: (r) => <Badge variant={RFI_BADGE[r.status]}>{t(`documents.rfiStatuses.${r.status}`)}</Badge>,
        exportValue: (r) => t(`documents.rfiStatuses.${r.status}`),
      },
      { id: "response", header: t("documents.response"), cell: () => null, className: "hidden", exportValue: (r) => r.response },
    ],
    fields: [
      { name: "subject", label: t("documents.subject"), type: "text", required: true, span: 2 },
      { name: "addressed_to", label: t("documents.addressedTo"), type: "text", hint: t("documents.addressedToHint") },
      { name: "due_date", label: t("issues.dueDate"), type: "date" },
      { name: "question", label: t("documents.question"), type: "textarea", required: true },
      { name: "attachment_path", label: t("documents.attachment"), type: "file", module: "rfis", compress: false },
      { name: "response", label: t("documents.response"), type: "textarea" },
      { name: "status", label: t("common.status"), type: "select", options: statuses, required: true, defaultValue: "open" },
    ],
  };
  return <CrudPage config={config} projectId={projectId} currency={currency} embedded />;
}
