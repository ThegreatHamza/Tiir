import * as React from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TabBar } from "@/components/common/Tabs";
import { CrudPage } from "@/components/crud/CrudPage";
import type { CrudConfig } from "@/components/crud/types";
import { useCurrentCompany } from "@/features/companies/CompanyProvider";
import { useProject } from "@/features/projects/ProjectLayout";
import { currentLanguage } from "@/i18n";
import { formatDate, formatNumber, todayIso } from "@/lib/format";
import { UNITS } from "@/lib/units";

type Tab = "balances" | "movements" | "locations" | "thresholds";
const WRITERS = ["owner", "admin", "project_manager", "storekeeper"];

export function StockPage() {
  const { t } = useTranslation();
  const [tab, setTab] = React.useState<Tab>("balances");
  return (
    <div className="grid gap-3">
      <h2 className="text-lg font-semibold">{t("stock.title")}</h2>
      <TabBar
        tabs={(["balances", "movements", "locations", "thresholds"] as const).map((v) => ({ value: v, label: t(`stock.tabs.${v}`) }))}
        value={tab}
        onChange={setTab}
      />
      {tab === "balances" ? <Balances /> : tab === "movements" ? <Movements /> : tab === "locations" ? <Locations /> : <Thresholds />}
    </div>
  );
}

function locationField(name: string, label: string, required = true) {
  return {
    name,
    label,
    type: "relation" as const,
    required,
    relation: {
      table: "stock_locations" as const,
      scope: "project" as const,
      label: (r: Record<string, unknown>) => String(r.name),
      order: "name",
      allowEmpty: !required,
    },
  };
}

function Balances() {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const { projectId, currency } = useProject();
  const config: CrudConfig<"stock_movements", "stock_balances"> = {
    table: "stock_movements",
    view: "stock_balances",
    scope: "project",
    title: t("stock.tabs.balances"),
    singular: t("stock.item"),
    emptyTitle: t("stock.noStock"),
    emptyHint: t("stock.noStockHint"),
    canWrite: false,
    softDelete: false,
    rowKey: (r) => `${r.location_id}|${r.item_name}|${r.unit}`,
    tiebreak: "location_id",
    searchColumns: ["item_name", "location_name"],
    sortable: ["item_name", "location_name", "balance", "last_movement"],
    defaultSort: { id: "item_name", desc: false },
    filters: [{ name: "low", column: "low_stock", label: t("stock.allItems"), options: [{ value: "true", label: t("stock.lowOnly") }] }],
    columns: [
      {
        id: "item_name",
        header: t("stock.item"),
        sortable: true,
        cell: (r) => <span className="font-medium">{r.item_name}</span>,
        exportValue: (r) => r.item_name,
      },
      {
        id: "location_name",
        header: t("stock.location"),
        sortable: true,
        cell: (r) => r.location_name,
        exportValue: (r) => r.location_name,
      },
      {
        id: "balance",
        header: t("stock.balance"),
        sortable: true,
        align: "end",
        cell: (r) => (
          <span className={r.low_stock ? "inline-flex items-center gap-1 font-semibold text-destructive num" : "num"}>
            {r.low_stock ? <AlertTriangle className="size-4" aria-label={t("stock.low")} /> : null}
            {formatNumber(r.balance, lang)} {t(`units.${r.unit ?? "u"}`)}
          </span>
        ),
        exportValue: (r) => r.balance,
      },
      {
        id: "min_quantity",
        header: t("stock.minimum"),
        align: "end",
        cell: (r) => <span className="num">{r.min_quantity === null ? "—" : formatNumber(r.min_quantity, lang)}</span>,
        exportValue: (r) => r.min_quantity,
      },
      {
        id: "last_movement",
        header: t("stock.lastMovement"),
        sortable: true,
        cell: (r) => <span className="num">{formatDate(r.last_movement)}</span>,
        exportValue: (r) => formatDate(r.last_movement),
      },
    ],
    fields: [],
    mobileCard: (r) => (
      <div className="flex items-center justify-between gap-2">
        <div className="grid">
          <span className="font-medium">{r.item_name}</span>
          <span className="text-xs text-muted-foreground">{r.location_name}</span>
        </div>
        <span className={r.low_stock ? "font-semibold text-destructive num" : "num"}>
          {formatNumber(r.balance, lang)} {t(`units.${r.unit ?? "u"}`)}
        </span>
      </div>
    ),
  };
  return <CrudPage config={config} projectId={projectId} currency={currency} embedded />;
}

function Movements() {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const { company, role } = useCurrentCompany();
  const { projectId, currency } = useProject();
  const kinds = ["in", "out", "transfer", "adjustment"].map((v) => ({ value: v, label: t(`stock.kinds.${v}`) }));
  const units = UNITS.map((u) => ({ value: u, label: t(`units.${u}`) }));
  const config: CrudConfig<"stock_movements"> = {
    table: "stock_movements",
    scope: "project",
    title: t("stock.tabs.movements"),
    singular: t("stock.movement"),
    offline: "stock_movements",
    emptyTitle: t("stock.noMovements"),
    canWrite: WRITERS.includes(role),
    searchColumns: ["item_name", "reference"],
    sortable: ["movement_date", "item_name", "kind", "quantity"],
    defaultSort: { id: "movement_date", desc: true },
    filters: [{ name: "kind", label: t("stock.allKinds"), options: kinds }],
    columns: [
      {
        id: "movement_date",
        header: t("common.date"),
        sortable: true,
        cell: (r) => <span className="num">{formatDate(r.movement_date)}</span>,
        exportValue: (r) => formatDate(r.movement_date),
      },
      {
        id: "kind",
        header: t("stock.kind"),
        sortable: true,
        cell: (r) => (
          <Badge variant={r.kind === "in" ? "success" : r.kind === "out" ? "warning" : "secondary"}>{t(`stock.kinds.${r.kind}`)}</Badge>
        ),
        exportValue: (r) => t(`stock.kinds.${r.kind}`),
      },
      {
        id: "item_name",
        header: t("stock.item"),
        sortable: true,
        cell: (r) => <span className="font-medium">{r.item_name}</span>,
        exportValue: (r) => r.item_name,
      },
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
        id: "reference",
        header: t("common.reference"),
        cell: (r) => r.reference ?? (r.delivery_line_id ? t("stock.fromDelivery") : "—"),
        exportValue: (r) => r.reference,
      },
    ],
    fields: [
      { name: "kind", label: t("stock.kind"), type: "select", options: kinds, required: true, defaultValue: "out" },
      { name: "movement_date", label: t("common.date"), type: "date", required: true, defaultValue: todayIso(company.timezone) },
      locationField("location_id", t("stock.location")),
      { ...locationField("to_location_id", t("stock.toLocation"), false), visible: (v) => v.kind === "transfer" },
      { name: "item_name", label: t("stock.item"), type: "text", required: true, span: 2, hint: t("stock.itemHint") },
      { name: "quantity", label: t("estimating.quantity"), type: "number", required: true, hint: t("stock.quantityHint") },
      { name: "unit", label: t("estimating.unit"), type: "select", options: units, required: true, defaultValue: "u" },
      {
        name: "boq_item_id",
        label: t("stock.usedFor"),
        type: "relation",
        span: 2,
        relation: {
          table: "current_boq_items_site",
          scope: "project",
          label: (r) => `${String(r.code)} — ${String(r.description)}`,
          order: "position",
          allowEmpty: true,
        },
        visible: (v) => v.kind === "out",
      },
      { name: "reference", label: t("common.reference"), type: "text" },
    ],
    toPayload: (v) => ({
      ...v,
      to_location_id: v.kind === "transfer" ? v.to_location_id : null,
      boq_item_id: v.kind === "out" ? (v.boq_item_id ?? null) : null,
    }),
  };
  return <CrudPage config={config} projectId={projectId} currency={currency} embedded />;
}

function Locations() {
  const { t } = useTranslation();
  const { role } = useCurrentCompany();
  const { projectId, currency } = useProject();
  const config: CrudConfig<"stock_locations"> = {
    table: "stock_locations",
    scope: "project",
    title: t("stock.tabs.locations"),
    singular: t("stock.location"),
    emptyTitle: t("stock.noLocation"),
    emptyHint: t("stock.noLocationHint"),
    canWrite: WRITERS.includes(role),
    searchColumns: ["name"],
    sortable: ["name"],
    defaultSort: { id: "name", desc: false },
    columns: [
      {
        id: "name",
        header: t("common.name"),
        sortable: true,
        cell: (r) => <span className="font-medium">{r.name}</span>,
        exportValue: (r) => r.name,
      },
    ],
    fields: [{ name: "name", label: t("common.name"), type: "text", required: true, span: 2 }],
  };
  return <CrudPage config={config} projectId={projectId} currency={currency} embedded />;
}

function Thresholds() {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const { role } = useCurrentCompany();
  const { projectId, currency } = useProject();
  const units = UNITS.map((u) => ({ value: u, label: t(`units.${u}`) }));
  const config: CrudConfig<"stock_thresholds"> = {
    table: "stock_thresholds",
    scope: "project",
    title: t("stock.tabs.thresholds"),
    singular: t("stock.threshold"),
    emptyTitle: t("stock.noThresholds"),
    emptyHint: t("stock.noThresholdsHint"),
    canWrite: WRITERS.includes(role),
    searchColumns: ["item_name"],
    sortable: ["item_name", "min_quantity"],
    defaultSort: { id: "item_name", desc: false },
    columns: [
      {
        id: "item_name",
        header: t("stock.item"),
        sortable: true,
        cell: (r) => <span className="font-medium">{r.item_name}</span>,
        exportValue: (r) => r.item_name,
      },
      {
        id: "min_quantity",
        header: t("stock.minimum"),
        sortable: true,
        align: "end",
        cell: (r) => (
          <span className="num">
            {formatNumber(r.min_quantity, lang)} {t(`units.${r.unit}`)}
          </span>
        ),
        exportValue: (r) => r.min_quantity,
      },
    ],
    fields: [
      locationField("location_id", t("stock.location")),
      { name: "item_name", label: t("stock.item"), type: "text", required: true },
      { name: "min_quantity", label: t("stock.minimum"), type: "number", required: true, min: 0 },
      { name: "unit", label: t("estimating.unit"), type: "select", options: units, required: true, defaultValue: "u" },
    ],
  };
  return <CrudPage config={config} projectId={projectId} currency={currency} embedded />;
}
