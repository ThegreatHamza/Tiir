import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { DateInput } from "@/components/common/DateInput";
import { errorMessage } from "@/lib/errors";
import { finishDate, type Calendar } from "@/lib/calc/schedule";
import { formatDate, formatNumber, type AppLanguage } from "@/lib/format";
import {
  addDependency,
  fetchCurrentBoqItems,
  fetchTaskLinks,
  setTaskLinks,
  updateDependency,
  updateTask,
  type TaskDependency,
} from "./api";
import type { PlanRow } from "./model";

const TYPES: TaskDependency["type"][] = ["FS", "SS", "FF", "SF"];

export function TaskDialog({
  row,
  rows,
  order,
  deps,
  cal,
  scope,
  readOnly,
  lang,
  onClose,
  onChanged,
}: {
  row: PlanRow;
  rows: Map<string, PlanRow>;
  order: string[];
  deps: TaskDependency[];
  cal: Calendar;
  scope: { companyId: string; projectId: string };
  readOnly: boolean;
  lang: AppLanguage;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const tk = row.task;
  const [name, setName] = React.useState(tk.name);
  const [start, setStart] = React.useState(tk.start_date);
  const [duration, setDuration] = React.useState(String(tk.duration));
  const [progress, setProgress] = React.useState(String(tk.progress));
  const [source, setSource] = React.useState(tk.progress_source);
  const [parent, setParent] = React.useState(tk.parent_id ?? "");
  const [notes, setNotes] = React.useState(tk.notes ?? "");
  const [newPred, setNewPred] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [itemFilter, setItemFilter] = React.useState("");

  const links = useQuery({ queryKey: ["task-links", tk.id], queryFn: () => fetchTaskLinks(tk.id) });
  const items = useQuery({ queryKey: ["current-boq-site", scope.projectId], queryFn: () => fetchCurrentBoqItems(scope.projectId) });
  const [linked, setLinked] = React.useState<Set<string> | null>(null);
  React.useEffect(() => {
    if (links.data && linked === null) setLinked(new Set(links.data.map((l) => l.boq_item_id)));
  }, [links.data, linked]);

  const preds = deps.filter((d) => d.successor_id === tk.id);
  const descendants = new Set<string>();
  const collect = (id: string) => rows.get(id)?.childIds.forEach((c) => (descendants.add(c), collect(c)));
  collect(tk.id);
  const label = (id: string) => {
    const r = rows.get(id);
    return r ? `${r.wbs} ${r.task.name}` : "";
  };

  async function save() {
    const d = Math.max(0, Math.round(Number(duration.replace(",", "."))));
    const p = Math.min(100, Math.max(0, Number(progress.replace(",", "."))));
    if (!name.trim() || Number.isNaN(d) || Number.isNaN(p)) return toast.error(t("validation.required"));
    setBusy(true);
    try {
      await updateTask(tk.id, {
        name: name.trim(),
        start_date: start,
        duration: d,
        end_date: finishDate(start, d, cal),
        progress: p,
        progress_source: source,
        parent_id: parent || null,
        notes: notes.trim() || null,
      });
      if (linked) await setTaskLinks(scope, tk.id, [...linked], links.data ?? []);
      await onChanged();
      onClose();
    } catch (e) {
      toast.error(errorMessage(t, e));
    } finally {
      setBusy(false);
    }
  }

  async function addPred() {
    if (!newPred) return;
    try {
      await addDependency({
        company_id: scope.companyId,
        project_id: scope.projectId,
        predecessor_id: newPred,
        successor_id: tk.id,
        type: "FS",
        lag_days: 0,
      });
      setNewPred("");
      await onChanged();
    } catch (e) {
      toast.error(errorMessage(t, e));
    }
  }

  const filteredItems = (items.data ?? [])
    .filter((i) => !itemFilter || `${i.code} ${i.description}`.toLowerCase().includes(itemFilter.toLowerCase()))
    .slice(0, 200);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            <span className="font-mono text-sm text-muted-foreground">{row.wbs}</span> {tk.name}
          </DialogTitle>
          <DialogDescription>
            {row.cpm
              ? t("planning.cpmSummary", {
                  start: formatDate(row.cpm.start),
                  finish: formatDate(row.cpm.finish),
                  float: row.cpm.totalFloat,
                })
              : t("planning.summaryTask")}
          </DialogDescription>
        </DialogHeader>
        <fieldset disabled={readOnly} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-4">
            <FormField id="tk-name" label={t("planning.task")} required className="sm:col-span-4">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </FormField>
            {!row.isSummary ? (
              <>
                <FormField id="tk-start" label={t("common.startDate")} hint={preds.length ? t("planning.drivenByLinks") : undefined}>
                  <DateInput value={start} onChange={setStart} />
                </FormField>
                <FormField id="tk-dur" label={t("planning.durationDays")} hint={t("planning.milestoneHint")}>
                  <Input value={duration} onChange={(e) => setDuration(e.target.value)} inputMode="numeric" className="ltr-nums" />
                </FormField>
                <FormField id="tk-src" label={t("planning.progressSource")}>
                  <NativeSelect value={source} onChange={(e) => setSource(e.target.value as typeof source)}>
                    <option value="manual">{t("planning.sources.manual")}</option>
                    <option value="boq">{t("planning.sources.boq")}</option>
                  </NativeSelect>
                </FormField>
                <FormField id="tk-prog" label={t("planning.progress")}>
                  <Input
                    value={progress}
                    onChange={(e) => setProgress(e.target.value)}
                    inputMode="decimal"
                    disabled={source === "boq"}
                    className="ltr-nums"
                  />
                </FormField>
              </>
            ) : null}
            <FormField id="tk-parent" label={t("planning.parent")} className="sm:col-span-2">
              <NativeSelect value={parent} onChange={(e) => setParent(e.target.value)}>
                <option value="">{t("planning.noParent")}</option>
                {order
                  .filter((id) => id !== tk.id && !descendants.has(id))
                  .map((id) => (
                    <option key={id} value={id}>
                      {label(id)}
                    </option>
                  ))}
              </NativeSelect>
            </FormField>
          </div>

          {!row.isSummary ? (
            <>
              <Separator />
              <div className="grid gap-2">
                <p className="text-sm font-semibold">{t("planning.predecessors")}</p>
                {preds.length === 0 ? <p className="text-sm text-muted-foreground">{t("planning.noPredecessors")}</p> : null}
                {preds.map((d) => (
                  <div key={d.id} className="flex flex-wrap items-center gap-2">
                    <span className="min-w-48 flex-1 truncate text-sm">{label(d.predecessor_id)}</span>
                    <NativeSelect
                      value={d.type}
                      onChange={(e) =>
                        void updateDependency(d.id, { type: e.target.value as TaskDependency["type"] })
                          .then(onChanged)
                          .catch((err: unknown) => toast.error(errorMessage(t, err)))
                      }
                      className="h-8 w-40"
                      aria-label={t("planning.linkType")}
                    >
                      {TYPES.map((x) => (
                        <option key={x} value={x}>
                          {t(`planning.linkTypes.${x}`)}
                        </option>
                      ))}
                    </NativeSelect>
                    <Input
                      defaultValue={String(d.lag_days)}
                      onBlur={(e) => {
                        const v = Math.round(Number(e.target.value));
                        if (!Number.isNaN(v) && v !== d.lag_days)
                          void updateDependency(d.id, { lag_days: v })
                            .then(onChanged)
                            .catch((err: unknown) => toast.error(errorMessage(t, err)));
                      }}
                      inputMode="numeric"
                      className="h-8 w-20 text-end ltr-nums"
                      aria-label={t("planning.lag")}
                      title={t("planning.lag")}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => void updateDependency(d.id, { deleted_at: new Date().toISOString() }).then(onChanged)}
                      aria-label={t("common.remove")}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
                {!readOnly ? (
                  <div className="flex gap-2">
                    <NativeSelect
                      value={newPred}
                      onChange={(e) => setNewPred(e.target.value)}
                      className="h-8"
                      aria-label={t("planning.addPredecessor")}
                    >
                      <option value="">{t("planning.addPredecessor")}</option>
                      {order
                        .filter((id) => id !== tk.id && !rows.get(id)?.isSummary && !preds.some((p) => p.predecessor_id === id))
                        .map((id) => (
                          <option key={id} value={id}>
                            {label(id)}
                          </option>
                        ))}
                    </NativeSelect>
                    <Button size="sm" variant="secondary" onClick={() => void addPred()} disabled={!newPred}>
                      <Plus /> {t("common.addShort")}
                    </Button>
                  </div>
                ) : null}
              </div>

              <Separator />
              <div className="grid gap-2">
                <p className="text-sm font-semibold">{t("planning.boqLinks")}</p>
                <p className="text-xs text-muted-foreground">{t("planning.boqLinksHint")}</p>
                <Input
                  value={itemFilter}
                  onChange={(e) => setItemFilter(e.target.value)}
                  placeholder={t("estimating.boq.searchItems")}
                  className="h-8"
                />
                <div className="max-h-48 overflow-y-auto rounded-md border p-1">
                  {items.isLoading || links.isLoading ? (
                    <Loader2 className="m-2 size-4 animate-spin" />
                  ) : filteredItems.length === 0 ? (
                    <p className="p-2 text-sm text-muted-foreground">{t("planning.noBoq")}</p>
                  ) : (
                    filteredItems.map((i) => (
                      <label key={i.id ?? ""} className="flex min-h-8 items-center gap-2 rounded px-1 text-sm hover:bg-muted">
                        <Checkbox
                          checked={linked?.has(i.id ?? "") ?? false}
                          onCheckedChange={(c) =>
                            setLinked((prev) => {
                              const next = new Set(prev ?? []);
                              if (c === true) next.add(i.id ?? "");
                              else next.delete(i.id ?? "");
                              return next;
                            })
                          }
                        />
                        <span className="w-14 shrink-0 font-mono text-xs">{i.code}</span>
                        <span className="flex-1 truncate">{i.description}</span>
                        <span className="text-xs text-muted-foreground num">
                          {formatNumber(i.quantity, lang, 3)} {t(`units.${i.unit ?? "u"}`)}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : null}
          <FormField id="tk-notes" label={t("common.notes")}>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </FormField>
        </fieldset>
        <DialogFooter className="sm:justify-between">
          {!readOnly ? (
            <Button
              variant="ghost"
              className="text-destructive"
              onClick={async () => {
                try {
                  await updateTask(tk.id, { deleted_at: new Date().toISOString() });
                  await onChanged();
                  onClose();
                } catch (e) {
                  toast.error(errorMessage(t, e));
                }
              }}
            >
              <Trash2 /> {t("common.delete")}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              {readOnly ? t("common.close") : t("common.cancel")}
            </Button>
            {!readOnly ? (
              <Button onClick={() => void save()} disabled={busy}>
                {busy ? <Loader2 className="animate-spin" /> : null}
                {t("common.save")}
              </Button>
            ) : null}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
