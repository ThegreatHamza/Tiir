import * as React from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Check, FileDown, Send, Undo2, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState, ErrorState } from "@/components/common/States";
import { StatCard } from "@/components/common/StatCard";
import { useCurrentCompany } from "@/features/companies/CompanyProvider";
import { useProject } from "@/features/projects/ProjectLayout";
import { currentLanguage } from "@/i18n";
import { errorMessage } from "@/lib/errors";
import { formatDate, formatMoney, formatNumber, formatPercent } from "@/lib/format";
import { lineAmounts } from "@/lib/calc/billing";
import { roundQuantity, type CurrencyCode } from "@/lib/calc/money";
import { decideClaim, fetchClaim, fetchClaimLines, setClaimStatus, updateClaimLine, type ClaimLine } from "./api";
import { exportClaimExcel, exportClaimPdf } from "./exports";
import { CLAIM_BADGE } from "./BillingPage";

export function ClaimPage() {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const { claimId = "" } = useParams();
  const qc = useQueryClient();
  const { company, companyId, role } = useCurrentCompany();
  const { project, projectId } = useProject();
  const key = ["company", companyId, "project", projectId, "claim", claimId];
  const claimQ = useQuery({ queryKey: [...key, "values"], queryFn: () => fetchClaim(claimId) });
  const linesQ = useQuery({ queryKey: [...key, "lines"], queryFn: () => fetchClaimLines(claimId, projectId) });
  const [deciding, setDeciding] = React.useState<null | boolean>(null);
  const [comment, setComment] = React.useState("");
  const [onlyActive, setOnlyActive] = React.useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: ["company", companyId, "project", projectId] });
  const status = useMutation({
    mutationFn: (s: "submitted" | "draft" | "paid") => setClaimStatus(claimId, s),
    onSuccess: () => {
      toast.success(t("common.saved"));
      void refresh();
    },
    onError: (e) => toast.error(errorMessage(t, e)),
  });
  const decide = useMutation({
    mutationFn: (approve: boolean) => decideClaim(claimId, approve, comment),
    onSuccess: () => {
      toast.success(t("common.saved"));
      setDeciding(null);
      setComment("");
      void refresh();
    },
    onError: (e) => toast.error(errorMessage(t, e)),
  });
  const saveLine = useMutation({
    mutationFn: ({ id, value }: { id: string; value: number }) => updateClaimLine(id, value),
    onSuccess: () => void qc.invalidateQueries({ queryKey: key }),
    onError: (e) => toast.error(errorMessage(t, e)),
  });

  if (claimQ.isLoading || linesQ.isLoading) return <Skeleton className="h-96" />;
  if (claimQ.error || linesQ.error)
    return <ErrorState message={errorMessage(t, claimQ.error ?? linesQ.error)} onRetry={() => void refresh()} />;
  const claim = claimQ.data;
  if (!claim) return <EmptyState title={t("billing.notFound")} />;
  const lines = linesQ.data ?? [];
  const currency = claim.currency as CurrencyCode;
  const m = (n: number | null | undefined) => formatMoney(n ?? 0, currency, lang);
  const editable = claim.status === "draft" && ["owner", "admin", "project_manager", "accountant"].includes(role);
  const canDecide = claim.status === "submitted" && ["owner", "admin"].includes(role);
  const projectLabel = `${project.code} ${project.name}`;
  const shown = onlyActive ? lines.filter((l) => Number(l.cumulative_quantity) !== Number(l.previous_quantity)) : lines;

  return (
    <div className="grid gap-3">
      <Link to=".." relative="path" className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
        {t("billing.backToClaims")}
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            {t("billing.claimTitle", { number: claim.number })}
            <Badge variant={CLAIM_BADGE[claim.status]}>{t(`billing.statuses.${claim.status}`)}</Badge>
          </h2>
          <p className="text-sm text-muted-foreground num">
            {t("billing.period")}: {formatDate(claim.period_start)} – {formatDate(claim.period_end)}
            {claim.client_comment ? ` · ${t("billing.clientComment")}: ${claim.client_comment}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void exportClaimExcel(t, { projectLabel, claim, lines })}>
            <FileDown className="size-4" aria-hidden />
            {t("common.exportExcel")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void exportClaimPdf({ company, lang, projectLabel, claim, lines }).catch((e) => toast.error(errorMessage(t, e)))}
          >
            <FileDown className="size-4" aria-hidden />
            PDF
          </Button>
          {editable ? (
            <Button size="sm" onClick={() => status.mutate("submitted")} disabled={status.isPending}>
              <Send className="size-4" aria-hidden />
              {t("billing.submit")}
            </Button>
          ) : null}
          {(claim.status === "submitted" || claim.status === "rejected") &&
          ["owner", "admin", "project_manager", "accountant"].includes(role) ? (
            <Button variant="outline" size="sm" onClick={() => status.mutate("draft")} disabled={status.isPending}>
              <Undo2 className="size-4" aria-hidden />
              {t("billing.backToDraft")}
            </Button>
          ) : null}
          {canDecide ? (
            <>
              <Button size="sm" variant="outline" onClick={() => setDeciding(false)}>
                <X className="size-4" aria-hidden />
                {t("billing.reject")}
              </Button>
              <Button size="sm" onClick={() => setDeciding(true)}>
                <Check className="size-4" aria-hidden />
                {t("billing.approve")}
              </Button>
            </>
          ) : null}
          {claim.status === "approved" && ["owner", "admin", "accountant"].includes(role) ? (
            <Button size="sm" variant="outline" onClick={() => status.mutate("paid")} disabled={status.isPending}>
              {t("billing.markPaid")}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard
          label={t("billing.thisPeriod")}
          value={m(claim.this_period)}
          hint={`${t("billing.cumulative")} ${m(claim.gross_cumulative)}`}
        />
        <StatCard
          label={`${t("billing.retention")} ${formatPercent(claim.retention_rate, lang)}`}
          value={m(claim.retention)}
          hint={`${t("billing.toDate")} ${m(claim.retention_to_date)}`}
        />
        <StatCard
          label={`${t("billing.advanceRecovery")} ${formatPercent(claim.advance_recovery_rate, lang)}`}
          value={m(claim.advance_recovery)}
          hint={`${t("billing.vat")} ${m(claim.vat)}`}
        />
        <StatCard
          label={t("billing.netPayable")}
          value={m(claim.net_payable)}
          hint={`${t("billing.paid")} ${m(claim.paid_amount)}`}
          tone="good"
        />
      </div>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">{t("billing.lines")}</CardTitle>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} />
            {t("billing.onlyThisPeriod")}
          </label>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {lines.length === 0 ? <p className="p-4 text-sm text-muted-foreground">{t("billing.noLines")}</p> : null}
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-start">{t("estimating.code")}</th>
                <th className="px-3 py-2 text-start">{t("common.description")}</th>
                <th className="px-3 py-2 text-end">{t("billing.prevQty")}</th>
                <th className="w-36 px-3 py-2 text-end">{t("billing.cumQty")}</th>
                <th className="px-3 py-2 text-end">{t("estimating.unitPrice")}</th>
                <th className="px-3 py-2 text-end">{t("billing.thisPeriod")}</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((l) => (
                <LineRow
                  key={l.id}
                  line={l}
                  currency={currency}
                  editable={editable}
                  onSave={(value) => saveLine.mutate({ id: l.id, value })}
                />
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={deciding !== null} onOpenChange={(o) => !o && setDeciding(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{deciding ? t("billing.approve") : t("billing.reject")}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t("billing.commentPlaceholder")}
            aria-label={t("billing.clientComment")}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeciding(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => deciding !== null && decide.mutate(deciding)}
              disabled={decide.isPending || (deciding === false && !comment.trim())}
            >
              {t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LineRow({
  line,
  currency,
  editable,
  onSave,
}: {
  line: ClaimLine;
  currency: CurrencyCode;
  editable: boolean;
  onSave: (v: number) => void;
}) {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const [value, setValue] = React.useState(String(line.cumulative_quantity));
  const a = lineAmounts(
    {
      cumulativeQuantity: Number(line.cumulative_quantity),
      previousQuantity: Number(line.previous_quantity),
      unitPrice: Number(line.unit_price),
    },
    currency,
  );
  const below = Number(line.cumulative_quantity) < Number(line.previous_quantity);
  return (
    <tr className="border-t">
      <td className="px-3 py-1.5 num">{line.code}</td>
      <td className="px-3 py-1.5">{line.description}</td>
      <td className="px-3 py-1.5 text-end num">
        {formatNumber(Number(line.previous_quantity), lang, 3)} {t(`units.${line.unit}`)}
      </td>
      <td className="px-3 py-1">
        {editable ? (
          <Input
            inputMode="decimal"
            className="h-8 text-end num"
            value={value}
            aria-label={`${t("billing.cumQty")} ${line.code}`}
            onChange={(e) => setValue(e.target.value)}
            onBlur={() => {
              const n = roundQuantity(Number(value.replace(",", ".")));
              if (!Number.isFinite(n) || n < 0) {
                toast.error(t("validation.outOfRange"));
                setValue(String(line.cumulative_quantity));
              } else if (n !== Number(line.cumulative_quantity)) onSave(n);
            }}
          />
        ) : (
          <span className="block text-end num">{formatNumber(Number(line.cumulative_quantity), lang, 3)}</span>
        )}
      </td>
      <td className="px-3 py-1.5 text-end num">{formatMoney(Number(line.unit_price), currency, lang)}</td>
      <td className={`px-3 py-1.5 text-end num ${below ? "text-destructive" : ""}`}>{formatMoney(a.thisPeriod, currency, lang)}</td>
    </tr>
  );
}
