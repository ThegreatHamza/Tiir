import * as React from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";
import { errorMessage } from "@/lib/errors";
import { formatNumber } from "@/lib/format";
import { takeoffLineResult, takeoffQuantity } from "@/lib/calc/estimating";
import { currentLanguage } from "@/i18n";
import { EditableCell } from "./EditableCell";
import { insertTakeoff, updateTakeoff, type TakeoffLine, type VersionScope } from "./api";
import { useEstimateCache, useEstimateKeys, useTakeoff } from "./queries";

/** Measurement lines (métré) under one BoQ item. Item quantity = sum of results. */
export function TakeoffEditor({
  scope,
  itemId,
  unitLabel,
  readOnly,
}: {
  scope: VersionScope;
  itemId: string;
  unitLabel: string;
  readOnly: boolean;
}) {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const keys = useEstimateKeys();
  const qc = useQueryClient();
  const cache = useEstimateCache(scope.versionId);
  const query = useTakeoff(itemId);
  const [adding, setAdding] = React.useState(false);
  const lines = query.data ?? [];

  async function afterChange() {
    await qc.invalidateQueries({ queryKey: keys.takeoff(itemId) });
    await cache.refreshItem(itemId);
  }

  async function patch(
    line: TakeoffLine,
    values: Partial<Pick<TakeoffLine, "label" | "count" | "length" | "width" | "height" | "deleted_at">>,
  ) {
    try {
      await updateTakeoff(line.id, values);
      await afterChange();
    } catch (err) {
      toast.error(errorMessage(t, err));
    }
  }

  async function add() {
    setAdding(true);
    try {
      await insertTakeoff({
        company_id: scope.companyId,
        project_id: scope.projectId,
        version_id: scope.versionId,
        item_id: itemId,
        position: lines.length + 1,
        label: "",
        count: 1,
      });
      await afterChange();
    } catch (err) {
      toast.error(errorMessage(t, err));
    } finally {
      setAdding(false);
    }
  }

  if (query.isLoading) return <Skeleton className="h-24" />;

  const dim = (line: TakeoffLine, field: "count" | "length" | "width" | "height", label: string) => (
    <EditableCell
      type="number"
      value={line[field]}
      display={line[field] === null ? undefined : formatNumber(line[field], lang, 3)}
      label={label}
      readOnly={readOnly}
      allowEmpty={field !== "count"}
      onCommit={(v) => patch(line, { [field]: v === null ? null : Number(v) })}
    />
  );

  // Deductions (negative count) are allowed: count is edited with a sign toggle.
  return (
    <div className="grid gap-2">
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-2 py-1.5 text-start">{t("estimating.takeoff.label")}</th>
              <th className="w-20 px-1 py-1.5 text-end">{t("estimating.takeoff.count")}</th>
              <th className="w-24 px-1 py-1.5 text-end">{t("estimating.takeoff.length")}</th>
              <th className="w-24 px-1 py-1.5 text-end">{t("estimating.takeoff.width")}</th>
              <th className="w-24 px-1 py-1.5 text-end">{t("estimating.takeoff.height")}</th>
              <th className="w-28 px-2 py-1.5 text-end">{t("estimating.takeoff.result")}</th>
              <th className="w-10" aria-hidden />
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-2 py-4 text-center text-muted-foreground">
                  {t("estimating.takeoff.empty")}
                </td>
              </tr>
            ) : (
              lines.map((l) => {
                const result = takeoffLineResult(l);
                return (
                  <tr key={l.id} className="border-t">
                    <td className="px-1 py-0.5">
                      <EditableCell
                        value={l.label}
                        label={t("estimating.takeoff.label")}
                        readOnly={readOnly}
                        onCommit={(v) => patch(l, { label: String(v ?? "") })}
                      />
                    </td>
                    <td className="px-1 py-0.5">
                      <div className="flex items-center gap-0.5">
                        {!readOnly ? (
                          <button
                            type="button"
                            className={`rounded px-1 text-xs font-bold ${l.count < 0 ? "text-destructive" : "text-muted-foreground"}`}
                            onClick={() => void patch(l, { count: -l.count })}
                            aria-label={t("estimating.takeoff.toggleDeduction")}
                            title={t("estimating.takeoff.toggleDeduction")}
                          >
                            ±
                          </button>
                        ) : null}
                        {dim(l, "count", t("estimating.takeoff.count"))}
                      </div>
                    </td>
                    <td className="px-1 py-0.5">{dim(l, "length", t("estimating.takeoff.length"))}</td>
                    <td className="px-1 py-0.5">{dim(l, "width", t("estimating.takeoff.width"))}</td>
                    <td className="px-1 py-0.5">{dim(l, "height", t("estimating.takeoff.height"))}</td>
                    <td className={`px-2 py-0.5 text-end font-medium num ${result < 0 ? "text-destructive" : ""}`}>
                      {formatNumber(result, lang, 3)}
                    </td>
                    <td className="py-0.5 pe-1 text-end">
                      {!readOnly ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => void patch(l, { deleted_at: new Date().toISOString() })}
                          aria-label={t("common.delete")}
                        >
                          <Trash2 />
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot>
            <tr className="border-t bg-muted/40 font-semibold">
              <td colSpan={5} className="px-2 py-1.5 text-end">
                {t("estimating.takeoff.total")}
              </td>
              <td className="px-2 py-1.5 text-end num">
                {formatNumber(takeoffQuantity(lines), lang, 3)} {unitLabel}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
      {!readOnly ? (
        <div>
          <Button variant="outline" size="sm" onClick={() => void add()} disabled={adding}>
            {adding ? <Loader2 className="animate-spin" /> : <Plus />} {t("estimating.takeoff.addLine")}
          </Button>
          <p className="mt-1 text-xs text-muted-foreground">{t("estimating.takeoff.hint")}</p>
        </div>
      ) : null}
    </div>
  );
}
