import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { FormField } from "@/components/ui/form-field";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DateInput } from "@/components/common/DateInput";
import { useCurrentCompany } from "@/features/companies/CompanyProvider";
import { currentLanguage } from "@/i18n";
import { errorMessage } from "@/lib/errors";
import { formatNumber, todayIso } from "@/lib/format";
import { roundQuantity } from "@/lib/calc/money";
import { receiptStatus } from "@/lib/calc/stock";
import { fetchLocations, fetchOpenOrderLines, receiveDelivery } from "./api";

/** Goods receipt against a purchase order. Mobile-first; saved through the offline queue. */
export function ReceiveDialog({
  open,
  onOpenChange,
  projectId,
  orderId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projectId: string;
  orderId?: string;
}) {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const qc = useQueryClient();
  const { company, companyId } = useCurrentCompany();
  const [order, setOrder] = React.useState(orderId ?? "");
  const [location, setLocation] = React.useState("");
  const [date, setDate] = React.useState(todayIso(company.timezone));
  const [note, setNote] = React.useState("");
  const [qty, setQty] = React.useState<Record<string, { received: string; rejected: string }>>({});
  const [busy, setBusy] = React.useState(false);
  const linesQ = useQuery({
    queryKey: ["company", companyId, "project", projectId, "open-po-lines"],
    queryFn: () => fetchOpenOrderLines(projectId),
    enabled: open,
  });
  const locQ = useQuery({
    queryKey: ["company", companyId, "project", projectId, "locations"],
    queryFn: () => fetchLocations(projectId),
    enabled: open,
  });

  React.useEffect(() => {
    if (!location && locQ.data?.[0]) setLocation(locQ.data[0].id);
  }, [locQ.data, location]);

  const all = linesQ.data ?? [];
  const orders = [
    ...new Map(
      all.filter((l) => l.order_status === "sent").map((l) => [l.purchase_order_id, `N° ${l.order_number} — ${l.supplier_name || "—"}`]),
    ).entries(),
  ];
  const lines = all.filter((l) => l.purchase_order_id === order);
  const num = (s: string | undefined) => {
    const n = Number(String(s ?? "").replace(",", "."));
    return Number.isFinite(n) && n > 0 ? roundQuantity(n) : 0;
  };

  async function submit() {
    if (!location) return toast.error(t("stock.noLocation"));
    setBusy(true);
    try {
      await receiveDelivery({
        companyId,
        projectId,
        orderId: order || null,
        locationId: location,
        date,
        note,
        label: t("procurement.deliveryLabel"),
        lines: lines.map((l) => ({
          orderLineId: l.id,
          description: l.description,
          unit: l.unit,
          resourceId: l.resource_id,
          received: num(qty[l.id]?.received),
          rejected: num(qty[l.id]?.rejected),
        })),
      });
      toast.success(t("procurement.received"));
      setQty({});
      onOpenChange(false);
      void qc.invalidateQueries({ queryKey: ["company", companyId] });
    } catch (e) {
      toast.error(errorMessage(t, e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("procurement.receive")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField id="rc-order" label={t("procurement.order")} required>
            <NativeSelect id="rc-order" value={order} onChange={(e) => setOrder(e.target.value)} disabled={Boolean(orderId)}>
              <option value="">{t("common.choose")}</option>
              {orders.map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField id="rc-loc" label={t("stock.location")} required>
            <NativeSelect id="rc-loc" value={location} onChange={(e) => setLocation(e.target.value)}>
              {(locQ.data ?? []).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </NativeSelect>
          </FormField>
          <FormField id="rc-date" label={t("common.date")} required>
            <DateInput id="rc-date" value={date} onChange={setDate} />
          </FormField>
          <FormField id="rc-note" label={t("procurement.deliveryNote")}>
            <Input id="rc-note" value={note} onChange={(e) => setNote(e.target.value)} />
          </FormField>
        </div>
        {(locQ.data ?? []).length === 0 && !locQ.isLoading ? <p className="text-sm text-destructive">{t("stock.noLocationHint")}</p> : null}
        <div className="grid gap-2">
          {order && lines.length === 0 ? <p className="text-sm text-muted-foreground">{t("procurement.nothingToReceive")}</p> : null}
          {lines.map((l) => {
            const received = Number(l.received_quantity ?? 0) + num(qty[l.id]?.received);
            const st = receiptStatus(Number(l.ordered_quantity), received);
            return (
              <div key={l.id} className="grid gap-2 rounded-md border p-2 sm:grid-cols-[1fr_7rem_7rem] sm:items-end">
                <div className="grid text-sm">
                  <span className="font-medium">{l.description}</span>
                  <span className={st === "over" ? "text-xs font-semibold text-destructive" : "text-xs text-muted-foreground"}>
                    {t("procurement.orderedReceived", {
                      ordered: formatNumber(l.ordered_quantity, lang),
                      received: formatNumber(l.received_quantity, lang),
                      unit: t(`units.${l.unit}`),
                    })}
                    {st === "over" ? ` · ${t("procurement.overDelivery")}` : ""}
                  </span>
                </div>
                <FormField id={`rc-q-${l.id}`} label={t("procurement.qtyReceived")}>
                  <Input
                    id={`rc-q-${l.id}`}
                    inputMode="decimal"
                    className="text-end num"
                    value={qty[l.id]?.received ?? ""}
                    onChange={(e) => setQty((s) => ({ ...s, [l.id]: { received: e.target.value, rejected: s[l.id]?.rejected ?? "" } }))}
                  />
                </FormField>
                <FormField id={`rc-r-${l.id}`} label={t("procurement.qtyRejected")}>
                  <Input
                    id={`rc-r-${l.id}`}
                    inputMode="decimal"
                    className="text-end num"
                    value={qty[l.id]?.rejected ?? ""}
                    onChange={(e) => setQty((s) => ({ ...s, [l.id]: { received: s[l.id]?.received ?? "", rejected: e.target.value } }))}
                  />
                </FormField>
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={busy || !order || !lines.some((l) => num(qty[l.id]?.received) > 0 || num(qty[l.id]?.rejected) > 0)}
          >
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
