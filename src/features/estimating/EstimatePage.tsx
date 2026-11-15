import * as React from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Download, FileSpreadsheet, FileText, ListOrdered, Loader2, Lock, Plus, Settings2, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState, ErrorState } from "@/components/common/States";
import { useCurrentCompany } from "@/features/companies/CompanyProvider";
import { fetchProject } from "@/features/projects/api";
import { qk } from "@/lib/queryKeys";
import { can } from "@/lib/roles";
import { cn } from "@/lib/utils";
import { errorMessage } from "@/lib/errors";
import { formatMoney, formatNumber } from "@/lib/format";
import { estimateSummary } from "@/lib/calc/estimating";
import { signedUrl } from "@/lib/supabase";
import { currentLanguage } from "@/i18n";
import { renumber, type BoqVersion } from "./api";
import { useEstimateCache, useVersionData, useVersions, useEstimateKeys } from "./queries";
import { BoqEditor } from "./BoqEditor";
import { ItemDialog } from "./ItemDialog";
import { AnalysesPanel } from "./AnalysesPanel";
import { ComparePanel } from "./ComparePanel";
import { NewVersionDialog, VersionSettingsDialog } from "./VersionDialogs";
import type { ExportFormat, ExportKind } from "./exports";

const TABS = ["boq", "analyses", "compare"] as const;
type Tab = (typeof TABS)[number];

const STATUS_VARIANT: Record<BoqVersion["status"], BadgeProps["variant"]> = {
  draft: "secondary",
  submitted: "warning",
  approved: "success",
};

export function EstimatePage() {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const { projectId = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const qc = useQueryClient();
  const keys = useEstimateKeys();
  const { company, companyId, role } = useCurrentCompany();
  const [newVersion, setNewVersion] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [openItemId, setOpenItemId] = React.useState<string | null>(null);
  const [exporting, setExporting] = React.useState(false);

  const project = useQuery({ queryKey: qk.project(companyId, projectId), queryFn: () => fetchProject(companyId, projectId) });
  const versions = useVersions(projectId);
  const list = versions.data ?? [];
  const requested = params.get("v");
  const version = list.find((v) => v.id === requested) ?? list.find((v) => v.is_current) ?? list[0] ?? null;
  const versionId = version?.id ?? null;
  const data = useVersionData(versionId);
  const cache = useEstimateCache(versionId ?? "");
  const tabParam = params.get("tab") as Tab | null;
  const tab: Tab = tabParam && TABS.includes(tabParam) ? tabParam : "boq";

  const setParam = (k: string, v: string | null) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (v) next.set(k, v);
        else next.delete(k);
        return next;
      },
      { replace: true },
    );

  if (project.isLoading || versions.isLoading) {
    return (
      <div className="grid gap-3">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-24" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (project.error || versions.error)
    return (
      <ErrorState
        message={errorMessage(t, project.error ?? versions.error)}
        onRetry={() => void Promise.all([project.refetch(), versions.refetch()])}
      />
    );
  const p = project.data;
  if (!p || !p.id) {
    return (
      <EmptyState
        title={t("projects.notFound")}
        description={t("projects.notFoundHint")}
        action={
          <Button asChild variant="outline">
            <Link to="/projects">{t("projects.backToList")}</Link>
          </Button>
        }
      />
    );
  }

  const currency = p.currency ?? company.default_currency;
  const editable = can.editEstimate(role) && !p.deleted_at;
  const scope = { companyId, projectId, versionId: versionId ?? "" };

  const header = (
    <div>
      <Link
        to={`/projects/${projectId}`}
        className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden /> {p.code} — {p.name}
      </Link>
      <h1 className="text-xl font-semibold">{t("estimating.title")}</h1>
    </div>
  );

  if (!version) {
    return (
      <div className="grid gap-4">
        {header}
        <EmptyState
          title={t("estimating.versions.noneTitle")}
          description={editable ? t("estimating.versions.noneHint") : t("estimating.versions.noneReadOnly")}
          action={
            editable ? (
              <Button onClick={() => setNewVersion(true)}>
                <Plus /> {t("estimating.versions.createFirst")}
              </Button>
            ) : null
          }
        />
        <NewVersionDialog
          open={newVersion}
          onOpenChange={setNewVersion}
          projectId={projectId}
          versions={[]}
          defaultSourceId={null}
          onCreated={() => void qc.invalidateQueries({ queryKey: keys.versions(projectId) })}
        />
      </div>
    );
  }

  const locked = version.status !== "draft";
  const readOnly = !editable || locked;
  const totals = data.totals.data;
  const summary = estimateSummary(totals?.total_ht ?? 0, totals?.total_dry_cost ?? 0, totals?.vat_rate ?? 0, currency);
  const items = data.items.data ?? [];
  const sections = data.sections.data ?? [];
  const upas = data.upas.data ?? [];
  const openItem = openItemId ? (items.find((i) => i.id === openItemId) ?? null) : null;

  async function doExport(kind: ExportKind, format: ExportFormat) {
    if (!version || !p) return;
    setExporting(true);
    try {
      const { runExport } = await import("./exports");
      await runExport(kind, format, {
        company,
        companyLogoUrl: company.logo_path ? await signedUrl(company.logo_path, 600) : null,
        project: { code: p.code ?? "", name: p.name ?? "", client_name: p.client_name, city: p.city },
        version,
        sections,
        items,
        upas,
        currency,
        vatRate: totals?.vat_rate ?? 0,
        lang,
      });
    } catch (e) {
      toast.error(errorMessage(t, e));
    } finally {
      setExporting(false);
    }
  }

  const money = (v: number | null | undefined) => formatMoney(v ?? 0, currency, lang);
  const loadingData = data.sections.isLoading || data.items.isLoading;

  return (
    <div className="grid gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        {header}
        <div className="flex flex-wrap items-center gap-2">
          <NativeSelect
            value={version.id}
            onChange={(e) => setParam("v", e.target.value)}
            aria-label={t("estimating.versions.choose")}
            className="w-64"
          >
            {list.map((v) => (
              <option key={v.id} value={v.id}>
                {`V${v.number} — ${v.name}${v.is_current ? ` ★` : ""} (${t(`estimating.versions.statuses.${v.status}`)})`}
              </option>
            ))}
          </NativeSelect>
          <Badge variant={STATUS_VARIANT[version.status]}>
            {locked ? <Lock className="me-1 size-3" aria-hidden /> : null}
            {t(`estimating.versions.statuses.${version.status}`)}
          </Badge>
          {version.is_current ? (
            <Badge variant="accent">
              <Star className="me-1 size-3" aria-hidden /> {t("estimating.versions.current")}
            </Badge>
          ) : null}
          {editable ? (
            <>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setSettingsOpen(true)}
                aria-label={t("estimating.versions.settingsShort")}
              >
                <Settings2 />
              </Button>
              <Button variant="outline" onClick={() => setNewVersion(true)}>
                <Plus /> {t("estimating.versions.new")}
              </Button>
            </>
          ) : null}
          {!readOnly ? (
            <Button
              variant="ghost"
              onClick={async () => {
                try {
                  await renumber(version.id);
                  await Promise.all([cache.invalidateSections(), cache.invalidateItems()]);
                  toast.success(t("estimating.boq.renumbered"));
                } catch (e) {
                  toast.error(errorMessage(t, e));
                }
              }}
            >
              <ListOrdered /> {t("estimating.boq.renumber")}
            </Button>
          ) : null}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button disabled={exporting || loadingData}>
                {exporting ? <Loader2 className="animate-spin" /> : <Download />} {t("estimating.exports.button")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {(["boq-priced", "boq-unpriced", "upa"] as const).map((kind, i) => (
                <React.Fragment key={kind}>
                  {i > 0 ? <DropdownMenuSeparator /> : null}
                  <DropdownMenuLabel>{t(`estimating.exports.kinds.${kind}`)}</DropdownMenuLabel>
                  <DropdownMenuItem onSelect={() => void doExport(kind, "xlsx")}>
                    <FileSpreadsheet /> {t("estimating.exports.formats.xlsx")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => void doExport(kind, "pdf")}>
                    <FileText /> {t("estimating.exports.formats.pdf")}
                  </DropdownMenuItem>
                </React.Fragment>
              ))}
              {lang === "ar" ? <p className="px-2 py-1.5 text-xs text-muted-foreground">{t("estimating.exports.arabicNote")}</p> : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {locked ? (
        <p className="flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm">
          <Lock className="size-4" aria-hidden /> {t("estimating.versions.lockedBanner")}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
        {(
          [
            [t("pdf.totalHt"), money(summary.ht), true],
            [t("pdf.vat", { rate: formatNumber(totals?.vat_rate ?? 0, lang, 3) }), money(summary.vat), false],
            [t("pdf.totalTtc"), money(summary.ttc), false],
            [t("estimating.summary.dryCost"), money(summary.dryCost), false],
            [
              t("estimating.summary.margin"),
              <>
                <bdi>{money(summary.margin)}</bdi>
                {summary.marginRate === null ? null : (
                  <>
                    {" · "}
                    <bdi>{`${formatNumber(summary.marginRate, lang, 2)} %`}</bdi>
                  </>
                )}
              </>,
              false,
            ],
            [t("settings.priceCoefficient"), <bdi key="k">{`× ${formatNumber(version.coefficient, lang, 4)}`}</bdi>, false],
          ] as [string, React.ReactNode, boolean][]
        ).map(([label, value, strong]) => (
          <Card key={String(label)}>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              {data.totals.isLoading ? (
                <Skeleton className="mt-1 h-6" />
              ) : (
                <p className={cn("num", strong ? "text-lg font-bold" : "font-semibold")}>
                  {typeof value === "string" ? <bdi>{value}</bdi> : value}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div role="tablist" aria-label={t("estimating.title")} className="flex gap-1 overflow-x-auto border-b">
        {TABS.map((key) => (
          <button
            key={key}
            role="tab"
            type="button"
            aria-selected={tab === key}
            onClick={() => setParam("tab", key === "boq" ? null : key)}
            className={cn(
              "-mb-px min-h-10 border-b-2 px-3 text-sm font-medium transition-colors",
              tab === key ? "border-accent text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t(`estimating.tabs.${key}`)}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {data.sections.error || data.items.error ? (
          <ErrorState
            message={errorMessage(t, data.sections.error ?? data.items.error)}
            onRetry={() => void Promise.all([data.sections.refetch(), data.items.refetch()])}
          />
        ) : tab === "boq" ? (
          loadingData ? (
            <Skeleton className="h-64" />
          ) : (
            <BoqEditor scope={scope} currency={currency} readOnly={readOnly} sections={sections} items={items} onOpenItem={setOpenItemId} />
          )
        ) : tab === "analyses" ? (
          <AnalysesPanel
            scope={scope}
            currency={currency}
            readOnly={readOnly}
            upas={upas}
            loading={data.upas.isLoading}
            items={items}
            versionCoefficient={version.coefficient}
          />
        ) : (
          <ComparePanel key={version.id} versions={list} defaultB={version.id} currency={currency} projectCode={p.code ?? ""} />
        )}
      </div>

      <ItemDialog
        item={openItem}
        scope={scope}
        currency={currency}
        sections={sections}
        sectionItems={(sid) =>
          items
            .filter((i) => i.section_id === sid)
            .sort((a, b) => a.position - b.position)
            .map((i) => i.id)
        }
        upas={upas}
        readOnly={readOnly}
        onOpenChange={(o) => !o && setOpenItemId(null)}
      />
      <NewVersionDialog
        open={newVersion}
        onOpenChange={setNewVersion}
        projectId={projectId}
        versions={list}
        defaultSourceId={version.id}
        onCreated={async (id) => {
          await qc.invalidateQueries({ queryKey: keys.versions(projectId) });
          setParam("v", id);
        }}
      />
      {settingsOpen ? (
        <VersionSettingsDialog
          version={version}
          onOpenChange={setSettingsOpen}
          onSaved={() => {
            void qc.invalidateQueries({ queryKey: keys.versions(projectId) });
            void cache.invalidateAll();
          }}
        />
      ) : null}
    </div>
  );
}
