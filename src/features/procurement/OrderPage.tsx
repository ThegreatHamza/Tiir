import * as React from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ArrowLeft, FileDown, PackageCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import { FormField } from "@/components/ui/form-field";
import { Skeleton } from "@/components/ui/skeleton";
import { DateInput } from "@/components/common/DateInput";
import { EmptyState, ErrorState } from "@/components/common/States";
import { CrudPage } from "@/components/crud/CrudPage";
import type { CrudConfig } from "@/components/crud/types";
import { useRelationOptions } from "@/components/crud/RelationSelect";
import { useCurrentCompany } from "@/features/companies/CompanyProvider";
import { useProject } from "@/features/projects/ProjectLayout";
import { currentLanguage } from "@/i18n";
import { errorMessage } from "@/lib/errors";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { moneyNumFmt } from "@/lib/export/excel";
import { makePdfContext, exportTablePdf } from "@/lib/pdf/export";
import { CURRENCY_DECIMALS, roundMoney, type CurrencyCode } from "@/lib/calc/money";
import { supabase } from "@/lib/supabase";
import { UNITS } from "@/lib/units";
import { can } from "@/lib/roles";
import { fetchOpenOrderLines, fetchOrder, updateOrder } from "./api";
import { PO_BADGE } from "./ProcurementPage";
import { ReceiveDialog } from "./ReceiveDialog";

export function OrderPage() {
  const { role } = useCurrentCompany();
  return can.seeCosts(role) && role !== "estimator" ? <PricedOrder /> : <SiteOrder />;
}

function Back() {
  const { t } = useTranslation();
  return (
    <Link to="../.." relative="path" className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
      {t("procurement.backToOrders")}
    </Link>
  );
}

function PricedOrder() {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const qc = useQueryClient();
  const { orderId = "" } = useParams();
  const { company, companyId, role } = useCurrentCompany();
  const { project, projectId, currency } = useProject();
  const [receiving, setReceiving] = React.useState(false);
  const key = ["company", companyId, "project", projectId, "order", orderId];
  const q = useQuery({ queryKey: key, queryFn: () => fetchOrder(orderId) });
  const suppliers = useRelationOptions(
    { name: "supplier_id", label: "", type: "relation", relation: { table: "suppliers", label: (r) => String(r.name), order: "name" } },
    companyId,
    undefined,
  );
  const save = useMutation({
    mutationFn: (v: Parameters<typeof updateOrder>[1]) => updateOrder(orderId, v),
    onSuccess: () => {
      toast.success(t("common.saved"));
      void qc.invalidateQueries({ queryKey: ["company", companyId] });
    },
    onError: (e) => toast.error(errorMessage(t, e)),
  });
  if (q.isLoading) return <Skeleton className="h-96" />;
  if (q.error) return <ErrorState message={errorMessage(t, q.error)} onRetry={() => void q.refetch()} />;
  const o = q.data;
  if (!o) return <EmptyState title={t("procurement.orderNotFound")} />;
  const editable = o.status === "draft" && ["owner", "admin", "project_manager", "accountant"].includes(role);
  const units = UNITS.map((u) => ({ value: u, label: t(`units.${u}`) }));
  const fmt = moneyNumFmt(CURRENCY_DECIMALS[currency]);

  const lines: CrudConfig<"purchase_order_lines"> = {
    table: "purchase_order_lines",
    scope: "project",
    title: t("procurement.lines"),
    singular: t("procurement.line"),
    emptyTitle: t("procurement.noLines"),
    canWrite: editable,
    where: { purchase_order_id: orderId },
    searchColumns: ["description"],
    sortable: ["description", "quantity", "unit_price"],
    defaultSort: { id: "description", desc: false },
    columns: [
      { id: "description", header: t("common.description"), sortable: true, cell: (r) => r.description, exportValue: (r) => r.description },
      {
        id: "quantity",
        header: t("estimating.quantity"),
        sortable: true,
        align: "end",
        cell: (r) => (
          <span className="num">
            {formatNumber(r.quantity, lang)} {t(`units.${r.unit}`)}
          </span>
        ),
        exportValue: (r) => r.quantity,
      },
      {
        id: "unit_price",
        header: t("estimating.unitPrice"),
        sortable: true,
        align: "end",
        cell: (r) => <span className="num">{formatMoney(r.unit_price, currency, lang)}</span>,
        exportValue: (r) => r.unit_price,
        numFmt: fmt,
      },
      {
        id: "amount",
        header: t("common.amount"),
        align: "end",
        cell: (r) => <span className="num">{formatMoney(roundMoney(r.quantity * r.unit_price, currency), currency, lang)}</span>,
        exportValue: (r) => roundMoney(r.quantity * r.unit_price, currency),
        numFmt: fmt,
      },
    ],
    fields: [
      {
        name: "resource_id",
        label: t("procurement.resource"),
        type: "relation",
        span: 2,
        relation: {
          table: "price_resources",
          label: (r) => `${String(r.code ?? "")} ${String(r.name)}`.trim(),
          order: "name",
          allowEmpty: true,
        },
      },
      { name: "description", label: t("common.description"), type: "text", required: true, span: 2 },
      { name: "quantity", label: t("estimating.quantity"), type: "number", required: true, min: 0.001 },
      { name: "unit", label: t("estimating.unit"), type: "select", options: units, required: true, defaultValue: "u" },
      { name: "unit_price", label: t("estimating.unitPrice"), type: "money", required: true, min: 0 },
      {
        name: "boq_item_id",
        label: t("costs.boqItem"),
        type: "relation",
        relation: {
          table: "current_boq_items_site",
          scope: "project",
          label: (r) => `${String(r.code)} — ${String(r.description)}`,
          order: "position",
          allowEmpty: true,
        },
      },
    ],
    toPayload: (v) => ({ ...v, purchase_order_id: orderId }),
  };

  async function pdf() {
    const { data, error } = await supabase
      .from("purchase_order_lines")
      .select("*")
      .eq("purchase_order_id", orderId)
      .is("deleted_at", null)
      .order("description");
    if (error) throw error;
    const cur = currency as CurrencyCode;
    const ctx = await makePdfContext({
      company,
      lang,
      currency: cur,
      title: (tt) => `${tt("procurement.order")} N° ${o!.number}`,
      subtitle: `${project.code} ${project.name}`,
      meta: (tt) => [
        [tt("procurement.supplier"), o!.supplier_name || "—"],
        [tt("procurement.orderDate"), formatDate(o!.order_date)],
        [tt("procurement.expected"), formatDate(o!.expected_date)],
      ],
    });
    const L = ctx.lang;
    await exportTablePdf(
      ctx,
      [
        {
          columns: [
            { label: ctx.t("common.description"), width: "46%" },
            { label: ctx.t("estimating.unit"), width: "8%" },
            { label: ctx.t("estimating.quantity"), width: "12%", align: "right" },
            { label: ctx.t("estimating.unitPrice"), width: "16%", align: "right" },
            { label: ctx.t("common.amount"), width: "18%", align: "right" },
          ],
          rows: [
            ...(data ?? []).map((l) => ({
              cells: [
                l.description,
                ctx.t(`units.${l.unit}`),
                formatNumber(l.quantity, L),
                formatMoney(l.unit_price, cur, L),
                formatMoney(roundMoney(l.quantity * l.unit_price, cur), cur, L),
              ],
            })),
            { cells: [ctx.t("common.total"), "", "", "", formatMoney(o!.total_amount, cur, L)], style: "total" as const },
          ],
        },
      ],
      {
        fileName: `${project.code}_BC_${o!.number}`,
        note: o!.notes ?? undefined,
        signatures: [ctx.t("procurement.signBuyer"), ctx.t("procurement.signSupplier")],
      },
    );
  }

  return (
    <div className="grid gap-3">
      <Back />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          {t("procurement.order")} N° {o.number}
          <Badge variant={PO_BADGE[o.status]}>{t(`procurement.poStatuses.${o.status}`)}</Badge>
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void pdf().catch((e) => toast.error(errorMessage(t, e)))}>
            <FileDown className="size-4" aria-hidden />
            PDF
          </Button>
          {editable ? (
            <Button size="sm" onClick={() => save.mutate({ status: "sent" })}>
              {t("procurement.markSent")}
            </Button>
          ) : null}
          {o.status === "sent" ? (
            <>
              <Button size="sm" onClick={() => setReceiving(true)}>
                <PackageCheck className="size-4" aria-hidden />
                {t("procurement.receive")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => save.mutate({ status: "closed" })}>
                {t("procurement.close")}
              </Button>
            </>
          ) : null}
          {o.status === "draft" || o.status === "sent" ? (
            <Button size="sm" variant="outline" onClick={() => save.mutate({ status: "cancelled" })}>
              {t("procurement.cancelOrder")}
            </Button>
          ) : null}
        </div>
      </div>
      <Card>
        <CardContent className="grid gap-3 p-3 sm:grid-cols-4">
          <FormField id="po-supplier" label={t("procurement.supplier")}>
            <NativeSelect
              id="po-supplier"
              value={o.supplier_id ?? ""}
              disabled={!editable}
              onChange={(e) => save.mutate({ supplier_id: e.target.value || null })}
            >
              <option value="">{t("common.none")}</option>
              {(suppliers.data ?? []).map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField id="po-date" label={t("procurement.orderDate")}>
            <DateInput id="po-date" value={o.order_date} disabled={!editable} onChange={(v) => save.mutate({ order_date: v })} />
          </FormField>
          <FormField id="po-expected" label={t("procurement.expected")}>
            <DateInput id="po-expected" value={o.expected_date} disabled={!editable} onChange={(v) => save.mutate({ expected_date: v })} />
          </FormField>
          <div className="grid gap-1">
            <span className="text-sm font-medium">{t("common.total")}</span>
            <span className="text-lg font-semibold num">{formatMoney(o.total_amount, currency, lang)}</span>
          </div>
        </CardContent>
      </Card>
      <CrudPage config={lines} projectId={projectId} currency={currency} embedded />
      {receiving ? <ReceiveDialog open onOpenChange={setReceiving} projectId={projectId} orderId={orderId} /> : null}
    </div>
  );
}

function SiteOrder() {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const { orderId = "" } = useParams();
  const { companyId } = useCurrentCompany();
  const { projectId } = useProject();
  const [receiving, setReceiving] = React.useState(false);
  const q = useQuery({
    queryKey: ["company", companyId, "project", projectId, "open-po-lines", orderId],
    queryFn: () => fetchOpenOrderLines(projectId, orderId),
  });
  if (q.isLoading) return <Skeleton className="h-64" />;
  if (q.error) return <ErrorState message={errorMessage(t, q.error)} onRetry={() => void q.refetch()} />;
  const lines = q.data ?? [];
  if (!lines.length) return <EmptyState title={t("procurement.orderNotFound")} />;
  return (
    <div className="grid gap-3">
      <Back />
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">
          {t("procurement.order")} N° {lines[0]?.order_number} · {lines[0]?.supplier_name}
        </h2>
        {lines[0]?.order_status === "sent" ? (
          <Button size="sm" onClick={() => setReceiving(true)}>
            <PackageCheck className="size-4" aria-hidden />
            {t("procurement.receive")}
          </Button>
        ) : null}
      </div>
      <Card>
        <CardContent className="grid gap-1 p-3">
          {lines.map((l) => (
            <div key={l.id} className="flex justify-between gap-2 border-b py-1 text-sm last:border-0">
              <span>{l.description}</span>
              <span className={l.over_delivered ? "font-semibold text-destructive num" : "num"}>
                {formatNumber(l.received_quantity, lang)} / {formatNumber(l.ordered_quantity, lang)} {t(`units.${l.unit}`)}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
      {receiving ? <ReceiveDialog open onOpenChange={setReceiving} projectId={projectId} orderId={orderId} /> : null}
    </div>
  );
}
