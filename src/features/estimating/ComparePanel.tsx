import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/common/States";
import { compareVersions, diffSummary, type ComparableItem, type DiffStatus } from "@/lib/calc/estimating";
import { formatMoney, formatNumber } from "@/lib/format";
import { errorMessage } from "@/lib/errors";
import { exportToExcel, moneyNumFmt } from "@/lib/export/excel";
import { CURRENCY_DECIMALS, type CurrencyCode } from "@/lib/calc/money";
import { currentLanguage } from "@/i18n";
import { fetchItems, type BoqItemValue, type BoqVersion } from "./api";
import { useEstimateKeys } from "./queries";

const toComparable = (i: BoqItemValue): ComparableItem => ({
  id: i.id,
  code: i.code,
  description: i.description,
  unit: i.unit,
  quantity: i.effective_quantity ?? 0,
  unitPrice: i.effective_unit_price,
  total: i.total_price ?? 0,
});

const VARIANT: Record<DiffStatus, BadgeProps["variant"]> = {
  added: "success",
  removed: "destructive",
  changed: "warning",
  unchanged: "secondary",
};

export function ComparePanel({
  versions,
  defaultB,
  currency,
  projectCode,
}: {
  versions: BoqVersion[];
  defaultB: string;
  currency: CurrencyCode;
  projectCode: string;
}) {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const keys = useEstimateKeys();
  const ordered = [...versions].sort((x, y) => x.number - y.number);
  const idxB = ordered.findIndex((v) => v.id === defaultB);
  // A = the version before B, or the next one when B is the first.
  const [a, setA] = React.useState((idxB > 0 ? ordered[idxB - 1] : ordered[1])?.id ?? "");
  const [b, setB] = React.useState(defaultB);
  const [filter, setFilter] = React.useState<DiffStatus | "all" | "diff">("diff");

  const qa = useQuery({ queryKey: keys.items(a), queryFn: () => fetchItems(a), enabled: Boolean(a) });
  const qb = useQuery({ queryKey: keys.items(b), queryFn: () => fetchItems(b), enabled: Boolean(b) });

  const rows = React.useMemo(
    () => (qa.data && qb.data ? compareVersions(qa.data.map(toComparable), qb.data.map(toComparable), currency) : []),
    [qa.data, qb.data, currency],
  );
  const summary = diffSummary(rows, currency);
  const visible = rows.filter((r) => (filter === "all" ? true : filter === "diff" ? r.status !== "unchanged" : r.status === filter));
  const label = (id: string) => {
    const v = versions.find((x) => x.id === id);
    return v ? `V${v.number} — ${v.name}` : "";
  };
  const money = (v: number | null | undefined) => formatMoney(v ?? null, currency, lang);
  const signed = (v: number) => (v > 0 ? `+${money(v)}` : money(v));

  async function exportDiff() {
    const fmt = moneyNumFmt(CURRENCY_DECIMALS[currency]);
    await exportToExcel(
      `${projectCode}_${t("estimating.compare.title")}`,
      t("estimating.compare.title"),
      [
        {
          header: t("estimating.compare.status"),
          value: (r: (typeof rows)[number]) => t(`estimating.compare.statuses.${r.status}`),
          width: 12,
        },
        { header: t("common.code"), value: (r) => (r.b ?? r.a)?.code },
        { header: t("estimating.designation"), value: (r) => (r.b ?? r.a)?.description, width: 40 },
        { header: t("estimating.unit"), value: (r) => t(`units.${(r.b ?? r.a)?.unit ?? "u"}`) },
        { header: `${t("estimating.quantity")} A`, value: (r) => r.a?.quantity ?? null },
        { header: `${t("estimating.quantity")} B`, value: (r) => r.b?.quantity ?? null },
        { header: `${t("estimating.unitPrice")} A`, value: (r) => r.a?.unitPrice ?? null, numFmt: fmt },
        { header: `${t("estimating.unitPrice")} B`, value: (r) => r.b?.unitPrice ?? null, numFmt: fmt },
        { header: `${t("estimating.total")} A`, value: (r) => r.a?.total ?? null, numFmt: fmt, width: 14 },
        { header: `${t("estimating.total")} B`, value: (r) => r.b?.total ?? null, numFmt: fmt, width: 14 },
        { header: t("estimating.compare.delta"), value: (r) => r.deltaTotal, numFmt: fmt, width: 14 },
      ],
      visible,
    );
  }

  if (versions.length < 2) return <p className="text-sm text-muted-foreground">{t("estimating.compare.needTwo")}</p>;

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="grid gap-1 text-sm">
          <span className="text-xs text-muted-foreground">{t("estimating.compare.before")}</span>
          <NativeSelect value={a} onChange={(e) => setA(e.target.value)} className="w-64">
            {ordered.map((v) => (
              <option key={v.id} value={v.id}>
                {label(v.id)}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="text-xs text-muted-foreground">{t("estimating.compare.after")}</span>
          <NativeSelect value={b} onChange={(e) => setB(e.target.value)} className="w-64">
            {ordered.map((v) => (
              <option key={v.id} value={v.id}>
                {label(v.id)}
              </option>
            ))}
          </NativeSelect>
        </label>
        <NativeSelect
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="w-48"
          aria-label={t("estimating.compare.show")}
        >
          <option value="diff">{t("estimating.compare.onlyChanges")}</option>
          <option value="all">{t("estimating.compare.everything")}</option>
          {(["added", "removed", "changed"] as const).map((s) => (
            <option key={s} value={s}>
              {t(`estimating.compare.statuses.${s}`)}
            </option>
          ))}
        </NativeSelect>
        <Button variant="outline" className="ms-auto" onClick={() => void exportDiff()} disabled={!rows.length}>
          <Download /> {t("common.exportExcel")}
        </Button>
      </div>

      {qa.error || qb.error ? (
        <ErrorState message={errorMessage(t, qa.error ?? qb.error)} onRetry={() => void Promise.all([qa.refetch(), qb.refetch()])} />
      ) : qa.isLoading || qb.isLoading ? (
        <Skeleton className="h-48" />
      ) : (
        <>
          <div className="grid gap-2 sm:grid-cols-5">
            {(["added", "removed", "changed", "unchanged"] as const).map((s) => (
              <Card key={s}>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">{t(`estimating.compare.statuses.${s}`)}</p>
                  <p className="text-lg font-semibold num">{summary[s]}</p>
                </CardContent>
              </Card>
            ))}
            <Card>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">{t("estimating.compare.delta")}</p>
                <p
                  className={`text-lg font-semibold num ${summary.deltaTotal < 0 ? "text-destructive" : summary.deltaTotal > 0 ? "text-success" : ""}`}
                >
                  {signed(summary.deltaTotal)}
                </p>
              </CardContent>
            </Card>
          </div>
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-2 py-2 text-start">{t("estimating.compare.status")}</th>
                  <th className="px-2 py-2 text-start">{t("common.code")}</th>
                  <th className="px-2 py-2 text-start">{t("estimating.designation")}</th>
                  <th className="px-2 py-2 text-end">{t("estimating.quantity")} A → B</th>
                  <th className="px-2 py-2 text-end">{t("estimating.unitPrice")} A → B</th>
                  <th className="px-2 py-2 text-end">{t("estimating.compare.delta")}</th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-2 py-6 text-center text-muted-foreground">
                      {t("estimating.compare.noDifferences")}
                    </td>
                  </tr>
                ) : (
                  visible.map((r) => {
                    const it = r.b ?? r.a;
                    return (
                      <tr key={r.key} className="border-t">
                        <td className="px-2 py-1.5">
                          <Badge variant={VARIANT[r.status]}>{t(`estimating.compare.statuses.${r.status}`)}</Badge>
                        </td>
                        <td className="px-2 py-1.5 font-mono text-xs ltr-nums">{it?.code}</td>
                        <td className="px-2 py-1.5">{it?.description}</td>
                        <td className="px-2 py-1.5 text-end num">
                          {r.a ? formatNumber(r.a.quantity, lang, 3) : "—"} → {r.b ? formatNumber(r.b.quantity, lang, 3) : "—"}
                        </td>
                        <td className="px-2 py-1.5 text-end num">
                          {r.a ? money(r.a.unitPrice) : "—"} → {r.b ? money(r.b.unitPrice) : "—"}
                        </td>
                        <td
                          className={`px-2 py-1.5 text-end font-medium num ${r.deltaTotal < 0 ? "text-destructive" : r.deltaTotal > 0 ? "text-success" : ""}`}
                        >
                          {signed(r.deltaTotal)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
