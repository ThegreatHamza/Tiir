import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Download, Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { DateInput } from "@/components/common/DateInput";
import { EmptyState, ErrorState } from "@/components/common/States";
import { StatCard } from "@/components/common/StatCard";
import { TabBar } from "@/components/common/Tabs";
import { CrudPage } from "@/components/crud/CrudPage";
import type { CrudConfig } from "@/components/crud/types";
import { useCurrentCompany } from "@/features/companies/CompanyProvider";
import { useProject } from "@/features/projects/ProjectLayout";
import { currentLanguage } from "@/i18n";
import { errorMessage } from "@/lib/errors";
import { formatDate, formatMoney, todayIso } from "@/lib/format";
import { exportToExcel, moneyNumFmt } from "@/lib/export/excel";
import { CURRENCY_DECIMALS, sumMoney } from "@/lib/calc/money";
import { createClaim, fetchClaims, type ClaimValues } from "./api";

export const CLAIM_BADGE: Record<ClaimValues["status"], BadgeProps["variant"]> = {
  draft: "secondary",
  submitted: "accent",
  approved: "success",
  rejected: "destructive",
  paid: "default",
};
const TABS = ["claims", "payments"] as const;

export function BillingPage() {
  const { t } = useTranslation();
  const [tab, setTab] = React.useState<(typeof TABS)[number]>("claims");
  return (
    <div className="grid gap-3">
      <h2 className="text-lg font-semibold">{t("billing.title")}</h2>
      <TabBar tabs={TABS.map((v) => ({ value: v, label: t(`billing.tabs.${v}`) }))} value={tab} onChange={setTab} />
      {tab === "claims" ? <ClaimsList /> : <PaymentsList />}
    </div>
  );
}

function ClaimsList() {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { company, companyId, role } = useCurrentCompany();
  const { project, projectId, currency } = useProject();
  const [open, setOpen] = React.useState(false);
  const [periodEnd, setPeriodEnd] = React.useState(todayIso(company.timezone));
  const q = useQuery({ queryKey: ["company", companyId, "project", projectId, "claims"], queryFn: () => fetchClaims(projectId) });
  const create = useMutation({
    mutationFn: () => createClaim(projectId, periodEnd),
    onSuccess: async (id) => {
      await qc.invalidateQueries({ queryKey: ["company", companyId, "project", projectId] });
      setOpen(false);
      navigate(`claims/${id}`);
    },
    onError: (e) => toast.error(errorMessage(t, e)),
  });
  const canCreate = ["owner", "admin", "project_manager", "accountant"].includes(role);
  const m = (n: number | null | undefined) => formatMoney(n ?? 0, currency, lang);

  if (q.isLoading) return <Skeleton className="h-64" />;
  if (q.error) return <ErrorState message={errorMessage(t, q.error)} onRetry={() => void q.refetch()} />;
  const claims = q.data ?? [];
  const counted = claims.filter((c) => c.status !== "rejected");
  const latest = counted[0];
  const fmt = moneyNumFmt(CURRENCY_DECIMALS[currency]);

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label={t("billing.claimedToDate")} value={m(latest?.gross_cumulative)} />
        <StatCard
          label={t("billing.netToDate")}
          value={m(
            sumMoney(
              counted.map((c) => c.net_payable ?? 0),
              currency,
            ),
          )}
        />
        <StatCard
          label={t("billing.received")}
          value={m(
            sumMoney(
              claims.map((c) => c.paid_amount ?? 0),
              currency,
            ),
          )}
        />
        <StatCard label={t("billing.retentionHeld")} value={m(latest?.retention_to_date)} />
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!claims.length}
          onClick={() =>
            void exportToExcel(
              `${project.code}_${t("billing.tabs.claims")}`,
              t("billing.tabs.claims"),
              [
                { header: "N°", value: (c: ClaimValues) => c.number },
                { header: t("billing.periodEnd"), value: (c) => formatDate(c.period_end) },
                { header: t("common.status"), value: (c) => t(`billing.statuses.${c.status}`) },
                { header: t("billing.thisPeriod"), value: (c) => c.this_period, numFmt: fmt },
                { header: t("billing.retention"), value: (c) => c.retention, numFmt: fmt },
                { header: t("billing.advanceRecovery"), value: (c) => c.advance_recovery, numFmt: fmt },
                { header: t("billing.vat"), value: (c) => c.vat, numFmt: fmt },
                { header: t("billing.netPayable"), value: (c) => c.net_payable, numFmt: fmt },
                { header: t("billing.paid"), value: (c) => c.paid_amount, numFmt: fmt },
              ],
              claims,
            )
          }
        >
          <Download className="size-4" aria-hidden />
          {t("common.exportExcel")}
        </Button>
        {canCreate ? (
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="size-4" aria-hidden />
            {t("billing.newClaim")}
          </Button>
        ) : null}
      </div>
      {claims.length === 0 ? (
        <EmptyState title={t("billing.noClaims")} description={t("billing.noClaimsHint")} />
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-start">N°</th>
                  <th className="px-3 py-2 text-start">{t("billing.period")}</th>
                  <th className="px-3 py-2 text-start">{t("common.status")}</th>
                  <th className="px-3 py-2 text-end">{t("billing.thisPeriod")}</th>
                  <th className="px-3 py-2 text-end">{t("billing.netPayable")}</th>
                  <th className="px-3 py-2 text-end">{t("billing.paid")}</th>
                </tr>
              </thead>
              <tbody>
                {claims.map((c) => (
                  <tr key={c.id} className="cursor-pointer border-t hover:bg-muted/40" onClick={() => navigate(`claims/${c.id}`)}>
                    <td className="px-3 py-2 font-medium num">{c.number}</td>
                    <td className="px-3 py-2 num">
                      {formatDate(c.period_start)} – {formatDate(c.period_end)}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={CLAIM_BADGE[c.status]}>{t(`billing.statuses.${c.status}`)}</Badge>
                    </td>
                    <td className="px-3 py-2 text-end num">{m(c.this_period)}</td>
                    <td className="px-3 py-2 text-end font-semibold num">{m(c.net_payable)}</td>
                    <td className="px-3 py-2 text-end num">{m(c.paid_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("billing.newClaim")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t("billing.newClaimHint")}</p>
          <FormField id="claim-period-end" label={t("billing.periodEnd")} required>
            <DateInput id="claim-period-end" value={periodEnd} onChange={setPeriodEnd} />
          </FormField>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={() => create.mutate()} disabled={create.isPending}>
              {t("common.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PaymentsList() {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const { company, role } = useCurrentCompany();
  const { projectId, currency } = useProject();
  const config: CrudConfig<"client_payments"> = {
    table: "client_payments",
    scope: "project",
    title: t("billing.tabs.payments"),
    singular: t("billing.payment"),
    emptyTitle: t("billing.noPayments"),
    canWrite: ["owner", "admin", "accountant"].includes(role),
    searchColumns: ["reference", "method", "notes"],
    sortable: ["payment_date", "amount"],
    defaultSort: { id: "payment_date", desc: true },
    columns: [
      {
        id: "payment_date",
        header: t("common.date"),
        sortable: true,
        cell: (r) => <span className="num">{formatDate(r.payment_date)}</span>,
        exportValue: (r) => formatDate(r.payment_date),
      },
      { id: "method", header: t("billing.method"), cell: (r) => r.method ?? "—", exportValue: (r) => r.method },
      { id: "reference", header: t("common.reference"), cell: (r) => r.reference ?? "—", exportValue: (r) => r.reference },
      {
        id: "amount",
        header: t("common.amount"),
        sortable: true,
        align: "end",
        cell: (r) => <span className="num font-semibold">{formatMoney(r.amount, currency, lang)}</span>,
        exportValue: (r) => r.amount,
        numFmt: moneyNumFmt(CURRENCY_DECIMALS[currency]),
      },
    ],
    fields: [
      { name: "payment_date", label: t("common.date"), type: "date", required: true, defaultValue: todayIso(company.timezone) },
      { name: "amount", label: t("common.amount"), type: "money", required: true, min: 0 },
      {
        name: "claim_id",
        label: t("billing.claim"),
        type: "relation",
        relation: {
          table: "progress_claims",
          scope: "project",
          label: (r) => t("billing.claimTitle", { number: Number(r.number) }),
          order: "number",
          allowEmpty: true,
        },
      },
      { name: "method", label: t("billing.method"), type: "text", hint: t("billing.methodHint") },
      { name: "reference", label: t("common.reference"), type: "text" },
      { name: "notes", label: t("common.notes"), type: "textarea" },
    ],
  };
  return <CrudPage config={config} projectId={projectId} currency={currency} embedded />;
}
