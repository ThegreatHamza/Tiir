import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Check, ListPlus, PackageCheck, Plus, ShoppingCart, X } from "lucide-react";
import { toast } from "sonner";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState, ErrorState } from "@/components/common/States";
import { TabBar } from "@/components/common/Tabs";
import { CrudPage } from "@/components/crud/CrudPage";
import type { CrudConfig } from "@/components/crud/types";
import { useCurrentCompany } from "@/features/companies/CompanyProvider";
import { useProject } from "@/features/projects/ProjectLayout";
import { currentLanguage } from "@/i18n";
import { errorMessage } from "@/lib/errors";
import { formatDate, formatMoney, formatNumber, todayIso } from "@/lib/format";
import { moneyNumFmt } from "@/lib/export/excel";
import { CURRENCY_DECIMALS } from "@/lib/calc/money";
import { can } from "@/lib/roles";
import { UNITS } from "@/lib/units";
import type { RowOf } from "@/lib/db";
import { createOrder, fetchOpenOrderLines, orderFromRequest, setRequestStatus } from "./api";
import { ReceiveDialog } from "./ReceiveDialog";

export const PR_BADGE: Record<string, BadgeProps["variant"]> = {
  draft: "secondary",
  submitted: "accent",
  approved: "success",
  rejected: "destructive",
  ordered: "default",
};
export const PO_BADGE: Record<string, BadgeProps["variant"]> = {
  draft: "secondary",
  sent: "accent",
  closed: "success",
  cancelled: "destructive",
};
type Tab = "requests" | "orders" | "deliveries";

export function ProcurementPage() {
  const { t } = useTranslation();
  const [tab, setTab] = React.useState<Tab>("requests");
  return (
    <div className="grid gap-3">
      <h2 className="text-lg font-semibold">{t("procurement.title")}</h2>
      <TabBar
        tabs={(["requests", "orders", "deliveries"] as const).map((v) => ({ value: v, label: t(`procurement.tabs.${v}`) }))}
        value={tab}
        onChange={setTab}
      />
      {tab === "requests" ? <Requests /> : tab === "orders" ? <Orders /> : <Deliveries />}
    </div>
  );
}

function Requests() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { role } = useCurrentCompany();
  const { projectId, currency } = useProject();
  const [linesOf, setLinesOf] = React.useState<RowOf<"purchase_requests"> | null>(null);
  const statuses = ["draft", "submitted", "approved", "rejected", "ordered"].map((v) => ({
    value: v,
    label: t(`procurement.prStatuses.${v}`),
  }));
  const approver = ["owner", "admin", "project_manager"].includes(role);
  const buyer = ["owner", "admin", "project_manager", "accountant"].includes(role);
  const act = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "submitted" | "approved" | "rejected" | "order" }) => {
      if (action === "order") return orderFromRequest(id);
      await setRequestStatus(id, action);
      return null;
    },
    onSuccess: (orderId) => {
      toast.success(t("common.saved"));
      if (orderId) navigate(`orders/${orderId}`);
    },
    onError: (e) => toast.error(errorMessage(t, e)),
  });
  const config: CrudConfig<"purchase_requests"> = {
    table: "purchase_requests",
    scope: "project",
    title: t("procurement.tabs.requests"),
    singular: t("procurement.requestSingular"),
    emptyTitle: t("procurement.noRequests"),
    emptyHint: t("procurement.noRequestsHint"),
    canWrite: ["owner", "admin", "project_manager", "site_foreman", "storekeeper"].includes(role),
    searchColumns: ["title", "notes"],
    sortable: ["number", "title", "needed_by", "status"],
    defaultSort: { id: "number", desc: true },
    filters: [{ name: "status", label: t("issues.allStatuses"), options: statuses }],
    columns: [
      { id: "number", header: "N°", sortable: true, cell: (r) => <span className="num">{r.number}</span>, exportValue: (r) => r.number },
      {
        id: "title",
        header: t("procurement.requestTitle"),
        sortable: true,
        cell: (r) => <span className="font-medium">{r.title}</span>,
        exportValue: (r) => r.title,
      },
      {
        id: "needed_by",
        header: t("procurement.neededBy"),
        sortable: true,
        cell: (r) => <span className="num">{formatDate(r.needed_by)}</span>,
        exportValue: (r) => formatDate(r.needed_by),
      },
      {
        id: "status",
        header: t("common.status"),
        sortable: true,
        cell: (r) => <Badge variant={PR_BADGE[r.status]}>{t(`procurement.prStatuses.${r.status}`)}</Badge>,
        exportValue: (r) => t(`procurement.prStatuses.${r.status}`),
      },
    ],
    fields: [
      { name: "title", label: t("procurement.requestTitle"), type: "text", required: true, span: 2 },
      { name: "needed_by", label: t("procurement.neededBy"), type: "date" },
      { name: "notes", label: t("common.notes"), type: "textarea" },
    ],
    rowActions: (r) => (
      <>
        <Button variant="ghost" size="sm" onClick={() => setLinesOf(r)} aria-label={t("procurement.lines")}>
          <ListPlus className="size-4" aria-hidden />
        </Button>
        {r.status === "draft" ? (
          <Button variant="ghost" size="sm" onClick={() => act.mutate({ id: r.id, action: "submitted" })}>
            {t("billing.submit")}
          </Button>
        ) : null}
        {approver && r.status === "submitted" ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => act.mutate({ id: r.id, action: "approved" })}
              aria-label={t("billing.approve")}
            >
              <Check className="size-4 text-success" aria-hidden />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => act.mutate({ id: r.id, action: "rejected" })} aria-label={t("billing.reject")}>
              <X className="size-4 text-destructive" aria-hidden />
            </Button>
          </>
        ) : null}
        {buyer && r.status === "approved" ? (
          <Button variant="ghost" size="sm" onClick={() => act.mutate({ id: r.id, action: "order" })}>
            <ShoppingCart className="size-4" aria-hidden />
            {t("procurement.makeOrder")}
          </Button>
        ) : null}
      </>
    ),
  };
  return (
    <>
      <CrudPage config={config} projectId={projectId} currency={currency} embedded />
      <Dialog open={Boolean(linesOf)} onOpenChange={(o) => !o && setLinesOf(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{linesOf ? `${t("procurement.request")} N° ${linesOf.number} — ${linesOf.title}` : ""}</DialogTitle>
          </DialogHeader>
          {linesOf ? <RequestLines request={linesOf} /> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function RequestLines({ request }: { request: RowOf<"purchase_requests"> }) {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const { role } = useCurrentCompany();
  const { projectId, currency } = useProject();
  const units = UNITS.map((u) => ({ value: u, label: t(`units.${u}`) }));
  const config: CrudConfig<"purchase_request_lines"> = {
    table: "purchase_request_lines",
    scope: "project",
    title: t("procurement.lines"),
    singular: t("procurement.line"),
    emptyTitle: t("procurement.noLines"),
    canWrite: request.status === "draft" && ["owner", "admin", "project_manager", "site_foreman", "storekeeper"].includes(role),
    where: { purchase_request_id: request.id },
    searchColumns: ["description"],
    sortable: ["description", "quantity"],
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
    ],
    fields: [
      {
        name: "resource_id",
        label: t("procurement.resource"),
        type: "relation",
        span: 2,
        relation: {
          table: "resources_site",
          label: (r) => `${String(r.code ?? "")} ${String(r.name)}`.trim(),
          order: "name",
          allowEmpty: true,
        },
      },
      { name: "description", label: t("common.description"), type: "text", required: true, span: 2 },
      { name: "quantity", label: t("estimating.quantity"), type: "number", required: true, min: 0.001 },
      { name: "unit", label: t("estimating.unit"), type: "select", options: units, required: true, defaultValue: "u" },
    ],
    toPayload: (v) => ({ ...v, purchase_request_id: request.id }),
  };
  return <CrudPage config={config} projectId={projectId} currency={currency} embedded />;
}

function Orders() {
  const { role } = useCurrentCompany();
  return can.seeCosts(role) && role !== "estimator" ? <PricedOrders /> : <SiteOrders />;
}

function PricedOrders() {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const navigate = useNavigate();
  const { company, companyId, role } = useCurrentCompany();
  const { projectId, currency } = useProject();
  const statuses = ["draft", "sent", "closed", "cancelled"].map((v) => ({ value: v, label: t(`procurement.poStatuses.${v}`) }));
  const canWrite = ["owner", "admin", "project_manager", "accountant"].includes(role);
  const config: CrudConfig<"purchase_orders", "purchase_order_values"> = {
    table: "purchase_orders",
    view: "purchase_order_values",
    scope: "project",
    title: t("procurement.tabs.orders"),
    singular: t("procurement.order"),
    emptyTitle: t("procurement.noOrders"),
    canWrite: false,
    canDelete: false,
    onRowClick: (r) => navigate(`orders/${r.id}`),
    searchColumns: ["supplier_name", "notes"],
    sortable: ["number", "order_date", "expected_date", "status", "total_amount"],
    defaultSort: { id: "number", desc: true },
    filters: [{ name: "status", label: t("issues.allStatuses"), options: statuses }],
    columns: [
      {
        id: "number",
        header: "N°",
        sortable: true,
        cell: (r) => (
          <button type="button" className="font-medium underline-offset-2 hover:underline num" onClick={() => navigate(`orders/${r.id}`)}>
            {r.number}
          </button>
        ),
        exportValue: (r) => r.number,
      },
      { id: "supplier", header: t("procurement.supplier"), cell: (r) => r.supplier_name || "—", exportValue: (r) => r.supplier_name },
      {
        id: "order_date",
        header: t("procurement.orderDate"),
        sortable: true,
        cell: (r) => <span className="num">{formatDate(r.order_date)}</span>,
        exportValue: (r) => formatDate(r.order_date),
      },
      {
        id: "expected_date",
        header: t("procurement.expected"),
        sortable: true,
        cell: (r) => <span className="num">{formatDate(r.expected_date)}</span>,
        exportValue: (r) => formatDate(r.expected_date),
      },
      {
        id: "total_amount",
        header: t("common.total"),
        sortable: true,
        align: "end",
        cell: (r) => <span className="num">{formatMoney(r.total_amount, currency, lang)}</span>,
        exportValue: (r) => r.total_amount,
        numFmt: moneyNumFmt(CURRENCY_DECIMALS[currency]),
      },
      {
        id: "received",
        header: t("procurement.receivedShort"),
        align: "end",
        cell: (r) => (
          <span className="num">
            {formatNumber(r.ordered_quantity ? ((r.received_quantity ?? 0) / r.ordered_quantity) * 100 : 0, lang, 0)} %
          </span>
        ),
      },
      {
        id: "status",
        header: t("common.status"),
        sortable: true,
        cell: (r) => <Badge variant={PO_BADGE[r.status]}>{t(`procurement.poStatuses.${r.status}`)}</Badge>,
        exportValue: (r) => t(`procurement.poStatuses.${r.status}`),
      },
    ],
    fields: [],
    headerActions: canWrite
      ? () => (
          <Button
            size="sm"
            onClick={() =>
              void createOrder(companyId, projectId, todayIso(company.timezone))
                .then((id) => navigate(`orders/${id}`))
                .catch((e) => toast.error(errorMessage(t, e)))
            }
          >
            <Plus className="size-4" aria-hidden />
            {t("procurement.newOrder")}
          </Button>
        )
      : undefined,
    mobileCard: (r) => (
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 text-start"
        onClick={() => navigate(`orders/${r.id}`)}
      >
        <div className="grid">
          <span className="font-medium">
            N° {r.number} · {r.supplier_name || "—"}
          </span>
          <span className="text-xs text-muted-foreground">{formatDate(r.order_date)}</span>
        </div>
        <Badge variant={PO_BADGE[r.status]}>{t(`procurement.poStatuses.${r.status}`)}</Badge>
      </button>
    ),
  };
  return <CrudPage config={config} projectId={projectId} currency={currency} embedded />;
}

/** Orders as the store sees them: quantities only, no prices. */
function SiteOrders() {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const { companyId } = useCurrentCompany();
  const { projectId } = useProject();
  const [receiving, setReceiving] = React.useState<string | null>(null);
  const q = useQuery({
    queryKey: ["company", companyId, "project", projectId, "open-po-lines"],
    queryFn: () => fetchOpenOrderLines(projectId),
  });
  if (q.isLoading) return <Skeleton className="h-64" />;
  if (q.error) return <ErrorState message={errorMessage(t, q.error)} onRetry={() => void q.refetch()} />;
  const groups = new Map<string, NonNullable<typeof q.data>>();
  for (const l of q.data ?? []) groups.set(l.purchase_order_id, [...(groups.get(l.purchase_order_id) ?? []), l]);
  if (groups.size === 0) return <EmptyState title={t("procurement.noOrders")} description={t("procurement.noOrdersSiteHint")} />;
  return (
    <div className="grid gap-3">
      {[...groups.entries()].map(([orderId, lines]) => (
        <Card key={orderId}>
          <CardContent className="grid gap-2 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-medium">
                  N° {lines[0]?.order_number} · {lines[0]?.supplier_name || "—"}
                </span>
                <span className="ms-2 text-xs text-muted-foreground">{formatDate(lines[0]?.order_date)}</span>
              </div>
              {lines[0]?.order_status === "sent" ? (
                <Button size="sm" onClick={() => setReceiving(orderId)}>
                  <PackageCheck className="size-4" aria-hidden />
                  {t("procurement.receive")}
                </Button>
              ) : (
                <Badge variant="success">{t("procurement.poStatuses.closed")}</Badge>
              )}
            </div>
            {lines.map((l) => (
              <div key={l.id} className="flex justify-between gap-2 border-t pt-1 text-sm">
                <span>{l.description}</span>
                <span className={l.over_delivered ? "font-semibold text-destructive num" : "num"}>
                  {formatNumber(l.received_quantity, lang)} / {formatNumber(l.ordered_quantity, lang)} {t(`units.${l.unit}`)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
      {receiving ? <ReceiveDialog open onOpenChange={(o) => !o && setReceiving(null)} projectId={projectId} orderId={receiving} /> : null}
    </div>
  );
}

function Deliveries() {
  const { t } = useTranslation();
  const { role } = useCurrentCompany();
  const { projectId, currency } = useProject();
  const [open, setOpen] = React.useState(false);
  const canReceive = ["owner", "admin", "project_manager", "storekeeper"].includes(role);
  const config: CrudConfig<"deliveries"> = {
    table: "deliveries",
    scope: "project",
    title: t("procurement.tabs.deliveries"),
    singular: t("procurement.delivery"),
    emptyTitle: t("procurement.noDeliveries"),
    canWrite: false,
    canDelete: canReceive,
    searchColumns: ["delivery_note", "notes"],
    sortable: ["delivery_date"],
    defaultSort: { id: "delivery_date", desc: true },
    columns: [
      {
        id: "delivery_date",
        header: t("common.date"),
        sortable: true,
        cell: (r) => <span className="num">{formatDate(r.delivery_date)}</span>,
        exportValue: (r) => formatDate(r.delivery_date),
      },
      {
        id: "delivery_note",
        header: t("procurement.deliveryNote"),
        cell: (r) => r.delivery_note ?? "—",
        exportValue: (r) => r.delivery_note,
      },
      { id: "notes", header: t("common.notes"), cell: (r) => r.notes ?? "—", exportValue: (r) => r.notes },
    ],
    fields: [],
    headerActions: canReceive
      ? () => (
          <Button size="sm" onClick={() => setOpen(true)}>
            <PackageCheck className="size-4" aria-hidden />
            {t("procurement.receive")}
          </Button>
        )
      : undefined,
  };
  return (
    <>
      <CrudPage config={config} projectId={projectId} currency={currency} embedded />
      {open ? <ReceiveDialog open onOpenChange={setOpen} projectId={projectId} /> : null}
    </>
  );
}
