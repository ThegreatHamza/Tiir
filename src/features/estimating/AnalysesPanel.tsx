import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/States";
import { cn } from "@/lib/utils";
import { errorMessage } from "@/lib/errors";
import { formatMoney, formatNumber } from "@/lib/format";
import { parseAmount, RESOURCE_KINDS, type ResourceKind } from "@/lib/import/priceResources";
import { UNITS, type UnitCode } from "@/lib/units";
import { roundMoney, type CurrencyCode } from "@/lib/calc/money";
import { currentLanguage } from "@/i18n";
import { EditableCell } from "./EditableCell";
import { ResourcePicker } from "./ResourcePicker";
import {
  insertComponent,
  refreshUpaPrices,
  saveUpa,
  setUpaDeleted,
  updateComponent,
  type BoqItemValue,
  type UpaComponentValue,
  type UpaValue,
  type VersionScope,
} from "./api";
import { useComponents, useEstimateKeys } from "./queries";

export function AnalysesPanel({
  scope,
  currency,
  readOnly,
  upas,
  loading,
  items,
  versionCoefficient,
}: {
  scope: VersionScope;
  currency: CurrencyCode;
  readOnly: boolean;
  upas: UpaValue[];
  loading: boolean;
  items: BoqItemValue[];
  versionCoefficient: number;
}) {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const keys = useEstimateKeys();
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(false);
  const selected = upas.find((u) => u.id === selectedId) ?? null;

  React.useEffect(() => {
    if (!selectedId && upas[0]) setSelectedId(upas[0].id);
  }, [upas, selectedId]);

  const usage = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const i of items) if (i.upa_id) m.set(i.upa_id, (m.get(i.upa_id) ?? 0) + 1);
    return m;
  }, [items]);

  const invalidate = async (upaId?: string) => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: keys.upas(scope.versionId) }),
      qc.invalidateQueries({ queryKey: keys.items(scope.versionId) }),
      qc.invalidateQueries({ queryKey: keys.totals(scope.versionId) }),
      upaId ? qc.invalidateQueries({ queryKey: keys.components(upaId) }) : Promise.resolve(),
    ]);
  };

  if (loading) return <Skeleton className="h-64" />;

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <Card className="h-fit">
        <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle>{t("estimating.upa.title")}</CardTitle>
          {!readOnly ? (
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus /> {t("estimating.upa.new")}
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="p-2 pt-0">
          {upas.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">{t("estimating.upa.empty")}</p>
          ) : (
            <ul className="grid gap-1">
              {upas.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(u.id);
                      setCreating(false);
                    }}
                    aria-current={u.id === selectedId && !creating ? "true" : undefined}
                    className={cn("w-full rounded-md px-2 py-2 text-start hover:bg-muted", u.id === selectedId && !creating && "bg-muted")}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs ltr-nums">{u.code}</span>
                      <span className="text-sm font-semibold num">
                        {formatMoney(u.selling_price, currency, lang)}/{t(`units.${u.unit}`)}
                      </span>
                    </div>
                    <p className="truncate text-sm">{u.title}</p>
                    <p className="text-xs text-muted-foreground">{t("estimating.upa.usedBy", { count: usage.get(u.id) ?? 0 })}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {creating ? (
        <UpaHeaderForm
          scope={scope}
          currency={currency}
          upa={null}
          readOnly={readOnly}
          versionCoefficient={versionCoefficient}
          onSaved={async (id) => {
            await invalidate();
            setSelectedId(id);
            setCreating(false);
          }}
          onCancel={() => setCreating(false)}
        />
      ) : selected ? (
        <UpaEditor
          key={selected.id}
          scope={scope}
          currency={currency}
          readOnly={readOnly}
          upa={selected}
          usage={usage.get(selected.id) ?? 0}
          versionCoefficient={versionCoefficient}
          onChanged={invalidate}
          onDeleted={() => setSelectedId(null)}
        />
      ) : (
        <EmptyState title={t("estimating.upa.emptyTitle")} description={t("estimating.upa.emptyHint")} />
      )}
    </div>
  );
}

function UpaHeaderForm({
  scope,
  currency,
  upa,
  readOnly,
  versionCoefficient,
  onSaved,
  onCancel,
}: {
  scope: VersionScope;
  currency: CurrencyCode;
  upa: UpaValue | null;
  readOnly: boolean;
  versionCoefficient: number;
  onSaved: (id: string) => Promise<void> | void;
  onCancel?: () => void;
}) {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const [code, setCode] = React.useState(upa?.code ?? "");
  const [title, setTitle] = React.useState(upa?.title ?? "");
  const [unit, setUnit] = React.useState<UnitCode>(upa?.unit ?? "m3");
  const [coef, setCoef] = React.useState(upa?.coefficient === null || upa?.coefficient === undefined ? "" : String(upa.coefficient));
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || !title.trim()) return setError(t("validation.required"));
    const c = coef.trim() ? parseAmount(coef) : null;
    if (coef.trim() && (c === null || c <= 0)) return setError(t("validation.positive"));
    setBusy(true);
    setError(null);
    try {
      const id = await saveUpa(upa?.id ?? null, {
        company_id: scope.companyId,
        project_id: scope.projectId,
        version_id: scope.versionId,
        code: code.trim(),
        title: title.trim(),
        unit,
        coefficient: c,
      });
      await onSaved(id);
    } catch (err) {
      setError(errorMessage(t, err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="grid gap-3">
      <fieldset disabled={readOnly} className="grid gap-3 sm:grid-cols-6">
        <FormField id="upa-code" label={t("common.code")} required className="sm:col-span-1">
          <Input value={code} onChange={(e) => setCode(e.target.value)} className="ltr-nums" />
        </FormField>
        <FormField id="upa-title" label={t("estimating.designation")} required className="sm:col-span-3">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </FormField>
        <FormField id="upa-unit" label={t("estimating.upa.perUnit")} className="sm:col-span-1">
          <NativeSelect value={unit} onChange={(e) => setUnit(e.target.value as UnitCode)}>
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {t(`units.${u}`)}
              </option>
            ))}
          </NativeSelect>
        </FormField>
        <FormField
          id="upa-coef"
          label={t("estimating.upa.coefficient")}
          hint={t("estimating.upa.coefficientHint", { value: formatNumber(versionCoefficient, lang, 4) })}
          className="sm:col-span-1"
        >
          <Input
            value={coef}
            onChange={(e) => setCoef(e.target.value)}
            inputMode="decimal"
            placeholder={formatNumber(versionCoefficient, lang, 4)}
            className="ltr-nums"
          />
        </FormField>
      </fieldset>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {!readOnly ? (
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : null}
            {upa ? t("common.save") : t("estimating.upa.create")}
          </Button>
          {onCancel ? (
            <Button variant="outline" size="sm" onClick={onCancel}>
              {t("common.cancel")}
            </Button>
          ) : null}
        </div>
      ) : null}
      {!upa ? <p className="text-xs text-muted-foreground">{t("estimating.upa.currencyNote", { currency })}</p> : null}
    </form>
  );
}

function UpaEditor({
  scope,
  currency,
  readOnly,
  upa,
  usage,
  versionCoefficient,
  onChanged,
  onDeleted,
}: {
  scope: VersionScope;
  currency: CurrencyCode;
  readOnly: boolean;
  upa: UpaValue;
  usage: number;
  versionCoefficient: number;
  onChanged: (upaId?: string) => Promise<void>;
  onDeleted: () => void;
}) {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const components = useComponents(upa.id);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [free, setFree] = React.useState({
    designation: "",
    kind: "material" as ResourceKind,
    unit: "u" as UnitCode,
    quantity: "",
    cost: "",
  });
  const rows = components.data ?? [];
  const money = (v: number | null) => formatMoney(v, currency, lang);

  async function patch(c: UpaComponentValue, values: Parameters<typeof updateComponent>[1]) {
    try {
      await updateComponent(c.id, values);
      await onChanged(upa.id);
    } catch (err) {
      toast.error(errorMessage(t, err));
    }
  }

  async function add(values: {
    resource_id: string | null;
    kind: ResourceKind;
    designation: string;
    unit: UnitCode;
    quantity: number;
    unit_cost: number;
  }) {
    try {
      await insertComponent({
        company_id: scope.companyId,
        project_id: scope.projectId,
        version_id: scope.versionId,
        upa_id: upa.id,
        position: rows.length + 1,
        waste_rate: 0,
        ...values,
      });
      await onChanged(upa.id);
    } catch (err) {
      toast.error(errorMessage(t, err));
    }
  }

  async function addFree(e: React.FormEvent) {
    e.preventDefault();
    const q = parseAmount(free.quantity);
    const c = parseAmount(free.cost);
    if (!free.designation.trim() || q === null || q < 0 || c === null || c < 0) return toast.error(t("validation.number"));
    await add({
      resource_id: null,
      kind: free.kind,
      designation: free.designation.trim(),
      unit: free.unit,
      quantity: q,
      unit_cost: roundMoney(c, currency),
    });
    setFree({ ...free, designation: "", quantity: "", cost: "" });
  }

  const byKind = RESOURCE_KINDS.map((k) => ({
    kind: k,
    total: rows.filter((r) => r.kind === k).reduce((s, r) => s + (r.amount ?? 0), 0),
  })).filter((x) => x.total > 0);

  return (
    <Card>
      <CardHeader className="gap-3">
        <UpaHeaderForm
          scope={scope}
          currency={currency}
          upa={upa}
          readOnly={readOnly}
          versionCoefficient={versionCoefficient}
          onSaved={() => onChanged(upa.id)}
        />
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-2 py-1.5 text-start">{t("estimating.resources.kind")}</th>
                <th className="px-2 py-1.5 text-start">{t("estimating.designation")}</th>
                <th className="w-20 px-2 py-1.5 text-start">{t("estimating.unit")}</th>
                <th className="w-24 px-1 py-1.5 text-end">{t("estimating.upa.consumption")}</th>
                <th className="w-28 px-1 py-1.5 text-end">{t("estimating.unitCost")}</th>
                <th className="w-20 px-1 py-1.5 text-end">{t("estimating.upa.waste")}</th>
                <th className="w-28 px-2 py-1.5 text-end">{t("estimating.upa.amount")}</th>
                <th className="w-10" aria-hidden />
              </tr>
            </thead>
            <tbody>
              {components.isLoading ? (
                <tr>
                  <td colSpan={8} className="p-3">
                    <Skeleton className="h-8" />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-2 py-4 text-center text-muted-foreground">
                    {t("estimating.upa.noComponents")}
                  </td>
                </tr>
              ) : (
                rows.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="px-2 py-0.5">
                      <Badge variant="secondary">{t(`estimating.kinds.${c.kind}`)}</Badge>
                    </td>
                    <td className="px-1 py-0.5">
                      <EditableCell
                        value={c.designation}
                        label={t("estimating.designation")}
                        readOnly={readOnly}
                        allowEmpty={false}
                        onCommit={(v) => patch(c, { designation: String(v) })}
                      />
                    </td>
                    <td className="px-2 py-0.5">{t(`units.${c.unit}`)}</td>
                    <td className="px-1 py-0.5">
                      <EditableCell
                        type="number"
                        value={c.quantity}
                        display={formatNumber(c.quantity, lang, 4)}
                        label={t("estimating.upa.consumption")}
                        readOnly={readOnly}
                        allowEmpty={false}
                        onCommit={(v) => patch(c, { quantity: Number(v) })}
                      />
                    </td>
                    <td className="px-1 py-0.5">
                      <EditableCell
                        type="number"
                        value={c.unit_cost}
                        display={money(c.unit_cost)}
                        label={t("estimating.unitCost")}
                        readOnly={readOnly}
                        allowEmpty={false}
                        onCommit={(v) => patch(c, { unit_cost: roundMoney(Number(v), currency) })}
                      />
                    </td>
                    <td className="px-1 py-0.5">
                      <EditableCell
                        type="number"
                        value={c.waste_rate}
                        display={`${formatNumber(c.waste_rate, lang, 3)} %`}
                        label={t("estimating.upa.waste")}
                        readOnly={readOnly}
                        allowEmpty={false}
                        onCommit={async (v) => {
                          if (Number(v) > 100) toast.error(t("validation.percentRange"));
                          else await patch(c, { waste_rate: Number(v) });
                        }}
                      />
                    </td>
                    <td className="px-2 py-0.5 text-end font-medium num">{money(c.amount)}</td>
                    <td className="py-0.5 pe-1 text-end">
                      {!readOnly ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => void patch(c, { deleted_at: new Date().toISOString() })}
                          aria-label={t("common.delete")}
                        >
                          <Trash2 />
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!readOnly ? (
          <div className="grid gap-2">
            <ResourcePicker
              currency={currency}
              onPick={(r) =>
                void add({ resource_id: r.id, kind: r.kind, designation: r.name, unit: r.unit, quantity: 1, unit_cost: r.unit_cost })
              }
            />
            <form className="flex flex-wrap gap-2" onSubmit={(e) => void addFree(e)}>
              <NativeSelect
                value={free.kind}
                onChange={(e) => setFree({ ...free, kind: e.target.value as ResourceKind })}
                aria-label={t("estimating.resources.kind")}
                className="h-8 w-36"
              >
                {RESOURCE_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {t(`estimating.kinds.${k}`)}
                  </option>
                ))}
              </NativeSelect>
              <Input
                value={free.designation}
                onChange={(e) => setFree({ ...free, designation: e.target.value })}
                placeholder={t("estimating.upa.freeLine")}
                aria-label={t("estimating.designation")}
                className="h-8 min-w-40 flex-1"
              />
              <NativeSelect
                value={free.unit}
                onChange={(e) => setFree({ ...free, unit: e.target.value as UnitCode })}
                aria-label={t("estimating.unit")}
                className="h-8 w-24"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {t(`units.${u}`)}
                  </option>
                ))}
              </NativeSelect>
              <Input
                value={free.quantity}
                onChange={(e) => setFree({ ...free, quantity: e.target.value })}
                inputMode="decimal"
                placeholder={t("estimating.upa.consumption")}
                aria-label={t("estimating.upa.consumption")}
                className="h-8 w-28 text-end ltr-nums"
              />
              <Input
                value={free.cost}
                onChange={(e) => setFree({ ...free, cost: e.target.value })}
                inputMode="decimal"
                placeholder={t("estimating.unitCost")}
                aria-label={t("estimating.unitCost")}
                className="h-8 w-28 text-end ltr-nums"
              />
              <Button type="submit" size="sm" variant="secondary">
                <Plus /> {t("estimating.upa.addLine")}
              </Button>
            </form>
          </div>
        ) : null}

        <dl className="grid gap-2 rounded-md bg-muted/40 p-3 sm:grid-cols-4">
          {byKind.map((k) => (
            <div key={k.kind}>
              <dt className="text-xs text-muted-foreground">{t(`estimating.kinds.${k.kind}`)}</dt>
              <dd className="num">{money(k.total)}</dd>
            </div>
          ))}
          <div>
            <dt className="text-xs text-muted-foreground">{t("estimating.upa.dryCost")}</dt>
            <dd className="font-semibold num">{money(upa.dry_cost)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t("estimating.upa.coefficient")}</dt>
            <dd className="num">× {formatNumber(upa.effective_coefficient, lang, 4)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t("estimating.upa.sellingPrice", { unit: t(`units.${upa.unit}`) })}</dt>
            <dd className="text-lg font-bold num">{money(upa.selling_price)}</dd>
          </div>
        </dl>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">{t("estimating.upa.usedBy", { count: usage })}</span>
          {!readOnly ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="ms-auto"
                disabled={refreshing}
                onClick={async () => {
                  setRefreshing(true);
                  try {
                    const n = await refreshUpaPrices(upa.id);
                    toast.success(t("estimating.upa.refreshed", { count: n ?? 0 }));
                    await onChanged(upa.id);
                  } catch (err) {
                    toast.error(errorMessage(t, err));
                  } finally {
                    setRefreshing(false);
                  }
                }}
              >
                {refreshing ? <Loader2 className="animate-spin" /> : <RefreshCw />} {t("estimating.upa.refreshPrices")}
              </Button>
              <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2 /> {t("common.delete")}
              </Button>
            </>
          ) : null}
        </div>
      </CardContent>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        destructive
        title={t("estimating.upa.deleteTitle")}
        description={t("estimating.upa.deleteBody", { code: upa.code, count: usage })}
        confirmLabel={t("common.delete")}
        onConfirm={async () => {
          try {
            await setUpaDeleted(upa.id);
            onDeleted();
            await onChanged();
          } catch (err) {
            toast.error(errorMessage(t, err));
          }
        }}
      />
    </Card>
  );
}
