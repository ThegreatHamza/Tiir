import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Check, FileDown, FileText, Image as ImageIcon, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState, ErrorState } from "@/components/common/States";
import { useCurrentCompany } from "@/features/companies/CompanyProvider";
import { CLAIM_BADGE } from "@/features/billing/BillingPage";
import { decideClaim } from "@/features/billing/api";
import { exportClaimPdf } from "@/features/billing/exports";
import { openFile } from "@/lib/files";
import { signPhotos } from "@/features/site/api";
import { currentLanguage } from "@/i18n";
import { errorMessage } from "@/lib/errors";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { supabase, type Views } from "@/lib/supabase";
import { fetchAllPages } from "@/lib/fetchAll";
import type { CurrencyCode } from "@/lib/calc/money";

type Overview = Views<"client_project_overview">;

/** What a client sees: progress, shared photos and documents, claims to approve. */
export function ClientPortal() {
  const { t } = useTranslation();
  const { companyId } = useCurrentCompany();
  const q = useQuery({
    queryKey: ["company", companyId, "portal"],
    queryFn: async () => {
      const { data, error } = await supabase.from("client_project_overview").select("*").eq("company_id", companyId).order("code");
      if (error) throw error;
      return data ?? [];
    },
  });
  const [open, setOpen] = React.useState<string | null>(null);
  if (q.isLoading) return <Skeleton className="h-72" />;
  if (q.error) return <ErrorState message={errorMessage(t, q.error)} onRetry={() => void q.refetch()} />;
  const projects = q.data ?? [];
  const current = projects.find((p) => p.project_id === open) ?? (projects.length === 1 ? projects[0] : undefined);
  return (
    <div className="grid gap-4">
      <PageHeader title={t("portal.title")} description={t("portal.subtitle")} />
      {projects.length === 0 ? <EmptyState title={t("portal.noProjects")} description={t("portal.noProjectsHint")} /> : null}
      {projects.length > 1 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {projects.map((p) => (
            <ProjectCard key={p.project_id} p={p} selected={current?.project_id === p.project_id} onOpen={() => setOpen(p.project_id)} />
          ))}
        </div>
      ) : null}
      {current ? <ProjectDetail p={current} /> : null}
    </div>
  );
}

function ProjectCard({ p, selected, onOpen }: { p: Overview; selected: boolean; onOpen: () => void }) {
  const { t } = useTranslation();
  const lang = currentLanguage();
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`rounded-lg border p-4 text-start hover:bg-muted/40 ${selected ? "ring-2 ring-primary" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold">
          <span className="num">{p.code}</span> · {p.name}
        </span>
        {p.claims_to_approve ? <Badge variant="warning">{t("portal.toApprove", { count: p.claims_to_approve })}</Badge> : null}
      </div>
      <Progress value={p.progress ?? 0} label={`${formatNumber(p.progress ?? 0, lang, 0)} %`} />
    </button>
  );
}

function Progress({ value, label }: { value: number; label: string }) {
  return (
    <div
      className="mt-2 flex items-center gap-2"
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="h-2.5 flex-1 rounded bg-muted">
        <div className="h-2.5 rounded bg-primary" style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      <span className="w-12 text-end text-sm font-semibold num">{label}</span>
    </div>
  );
}

function ProjectDetail({ p }: { p: Overview }) {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const { companyId } = useCurrentCompany();
  const q = useQuery({
    queryKey: ["company", companyId, "portal", p.project_id],
    queryFn: async () => {
      const [claims, docs, photos] = await Promise.all([
        supabase
          .from("progress_claim_values")
          .select("*")
          .eq("project_id", p.project_id)
          .is("deleted_at", null)
          .order("number", { ascending: false }),
        supabase
          .from("documents_current")
          .select("id, title, folder, file_path, version, updated_at")
          .eq("project_id", p.project_id)
          .eq("shared_with_client", true)
          .order("folder")
          .order("title"),
        supabase
          .from("photos")
          .select("id, storage_path, caption, taken_at")
          .eq("project_id", p.project_id)
          .eq("shared_with_client", true)
          .is("deleted_at", null)
          .order("taken_at", { ascending: false })
          .limit(24),
      ]);
      for (const r of [claims, docs, photos]) if (r.error) throw r.error;
      const urls = await signPhotos((photos.data ?? []).map((ph) => ph.storage_path));
      return {
        claims: claims.data ?? [],
        docs: docs.data ?? [],
        photos: (photos.data ?? []).map((ph) => ({ ...ph, url: urls.get(ph.storage_path) })),
      };
    },
  });
  return (
    <div className="grid gap-3">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            <span className="num">{p.code}</span> · {p.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm">
          <Progress value={p.progress ?? 0} label={`${formatNumber(p.progress ?? 0, lang, 0)} %`} />
          <p className="text-muted-foreground num">
            {formatDate(p.start_date)} – {formatDate(p.end_date)} · {t("portal.lastReport")}: {formatDate(p.last_report_date)}
          </p>
        </CardContent>
      </Card>
      {q.isLoading ? <Skeleton className="h-40" /> : null}
      {q.error ? <ErrorState message={errorMessage(t, q.error)} onRetry={() => void q.refetch()} /> : null}
      {q.data ? (
        <>
          <Claims project={p} claims={q.data.claims} />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="size-4" aria-hidden />
                {t("portal.documents")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {q.data.docs.length === 0 ? <p className="text-sm text-muted-foreground">{t("portal.noDocuments")}</p> : null}
              <ul className="grid gap-1">
                {q.data.docs.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-2 border-b py-1 text-sm last:border-0">
                    <span>
                      {d.folder ? <span className="text-muted-foreground">{d.folder} / </span> : null}
                      {d.title} <span className="text-xs text-muted-foreground num">v{d.version}</span>
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      aria-label={t("files.open")}
                      onClick={() => void openFile(d.file_path)}
                    >
                      <FileDown />
                    </Button>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ImageIcon className="size-4" aria-hidden />
                {t("portal.photos")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {q.data.photos.length === 0 ? <p className="text-sm text-muted-foreground">{t("portal.noPhotos")}</p> : null}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {q.data.photos.map((ph) => (
                  <figure key={ph.id} className="overflow-hidden rounded-md border">
                    {ph.url ? (
                      <img src={ph.url} alt={ph.caption ?? ""} loading="lazy" className="aspect-square w-full object-cover" />
                    ) : (
                      <div className="aspect-square bg-muted" />
                    )}
                    <figcaption className="p-1 text-xs text-muted-foreground">
                      {formatDate(ph.taken_at)}
                      {ph.caption ? ` · ${ph.caption}` : ""}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

function Claims({ project, claims }: { project: Overview; claims: Views<"progress_claim_values">[] }) {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const qc = useQueryClient();
  const { company, companyId } = useCurrentCompany();
  const [deciding, setDeciding] = React.useState<{ id: string; approve: boolean } | null>(null);
  const [comment, setComment] = React.useState("");
  const decide = useMutation({
    mutationFn: () => decideClaim(deciding!.id, deciding!.approve, comment),
    onSuccess: () => {
      toast.success(t("portal.decided"));
      setDeciding(null);
      setComment("");
      void qc.invalidateQueries({ queryKey: ["company", companyId, "portal"] });
    },
    onError: (e) => toast.error(errorMessage(t, e)),
  });
  async function pdf(c: Views<"progress_claim_values">) {
    const lines = await fetchAllPages<Views<"progress_claim_lines_client">>((f, to) =>
      supabase.from("progress_claim_lines_client").select("*").eq("claim_id", c.id).order("code").range(f, to),
    );
    await exportClaimPdf({
      company,
      lang,
      projectLabel: `${project.code} ${project.name}`,
      claim: c,
      lines: lines.map((l) => ({ ...l, unit: l.unit ?? "u", code: l.code ?? "", description: l.description ?? "" })),
    });
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("portal.claims")}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        {claims.length === 0 ? <p className="text-sm text-muted-foreground">{t("billing.noClaims")}</p> : null}
        {claims.map((c) => {
          const m = (n: number | null) => formatMoney(n ?? 0, c.currency as CurrencyCode, lang);
          return (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2">
              <div className="grid">
                <span className="flex items-center gap-2 font-medium">
                  {t("billing.claimTitle", { number: c.number })}
                  <Badge variant={CLAIM_BADGE[c.status]}>{t(`billing.statuses.${c.status}`)}</Badge>
                </span>
                <span className="text-xs text-muted-foreground num">
                  {formatDate(c.period_end)} · {t("billing.thisPeriod")} {m(c.this_period)} · {t("billing.netPayable")} {m(c.net_payable)}
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => void pdf(c).catch((e) => toast.error(errorMessage(t, e)))}>
                  <FileDown className="size-4" aria-hidden />
                  PDF
                </Button>
                {c.status === "submitted" ? (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setDeciding({ id: c.id, approve: false })}>
                      <X className="size-4" aria-hidden />
                      {t("billing.reject")}
                    </Button>
                    <Button size="sm" onClick={() => setDeciding({ id: c.id, approve: true })}>
                      <Check className="size-4" aria-hidden />
                      {t("billing.approve")}
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          );
        })}
      </CardContent>
      <Dialog open={Boolean(deciding)} onOpenChange={(o) => !o && setDeciding(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{deciding?.approve ? t("billing.approve") : t("billing.reject")}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={deciding?.approve ? t("billing.commentPlaceholder") : t("portal.rejectReason")}
            aria-label={t("billing.clientComment")}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeciding(null)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={() => decide.mutate()} disabled={decide.isPending || (deciding?.approve === false && !comment.trim())}>
              {t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
