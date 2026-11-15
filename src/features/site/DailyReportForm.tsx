import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Camera, CloudSun, Copy, HardHat, Loader2, Package, Plus, Ruler, Send, ShieldAlert, Trash2, Truck, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { DateInput } from "@/components/common/DateInput";
import { useCurrentCompany } from "@/features/companies/CompanyProvider";
import { useProject } from "@/features/projects/ProjectLayout";
import { enqueue, enqueuePhoto } from "@/lib/offline/sync";
import { newId } from "@/lib/offline/logic";
import { parseAmount } from "@/lib/import/priceResources";
import { UNITS, type UnitCode } from "@/lib/units";
import { formatNumber, todayIso } from "@/lib/format";
import { cn } from "@/lib/utils";
import { currentLanguage } from "@/i18n";
import type { OfflineTable } from "@/lib/offline/store";
import {
  fetchLastLabour,
  fetchReportDetail,
  fetchReportForDate,
  fetchSiteItems,
  fetchSiteResources,
  TRADES,
  WEATHER,
  type Report,
} from "./api";

type Row<T> = T & { id: string; _deleted?: boolean; _existing?: boolean };
type Labour = Row<{ trade: string; headcount: string; hours: string }>;
type Equip = Row<{ equipment_name: string; hours: string }>;
type Mat = Row<{ material_name: string; resource_id: string | null; quantity: string; unit: UnitCode }>;
type Prog = Row<{ boq_item_id: string; quantity: string; label: string }>;
type Inc = Row<{ kind: string; severity: string; description: string }>;
type NewPhoto = { id: string; file: File; url: string; caption: string };

const num = (s: string) => parseAmount(s) ?? 0;

export function DailyReportForm() {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { reportId = "new" } = useParams();
  const { company, companyId, role } = useCurrentCompany();
  const { projectId } = useProject();
  const canWrite = role === "owner" || role === "admin" || role === "project_manager" || role === "site_foreman";
  const isNew = reportId === "new";

  const detail = useQuery({
    queryKey: ["company", companyId, "site", "report", reportId],
    queryFn: () => fetchReportDetail(reportId),
    enabled: !isNew,
  });
  const items = useQuery({ queryKey: ["company", companyId, "site", "items", projectId], queryFn: () => fetchSiteItems(projectId) });
  const resources = useQuery({ queryKey: ["company", companyId, "site", "resources"], queryFn: () => fetchSiteResources(companyId) });

  const [id] = React.useState(() => (isNew ? newId() : reportId));
  const [date, setDate] = React.useState(todayIso(company.timezone));
  const [weather, setWeather] = React.useState<Report["weather"]>("sunny");
  const [temp, setTemp] = React.useState("");
  const [summary, setSummary] = React.useState("");
  const [labour, setLabour] = React.useState<Labour[]>([]);
  const [equipment, setEquipment] = React.useState<Equip[]>([]);
  const [materials, setMaterials] = React.useState<Mat[]>([]);
  const [progress, setProgress] = React.useState<Prog[]>([]);
  const [incidents, setIncidents] = React.useState<Inc[]>([]);
  const [photos, setPhotos] = React.useState<NewPhoto[]>([]);
  const [itemSearch, setItemSearch] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const loaded = React.useRef(false);

  React.useEffect(() => {
    const d = detail.data;
    if (!d?.report || loaded.current) return;
    loaded.current = true;
    setDate(d.report.report_date);
    setWeather(d.report.weather);
    setTemp(d.report.temperature_c === null ? "" : String(d.report.temperature_c));
    setSummary(d.report.summary);
    setLabour(d.labour.map((l) => ({ id: l.id, _existing: true, trade: l.trade, headcount: String(l.headcount), hours: String(l.hours) })));
    setEquipment(d.equipment.map((l) => ({ id: l.id, _existing: true, equipment_name: l.equipment_name, hours: String(l.hours) })));
    setMaterials(
      d.materials.map((l) => ({
        id: l.id,
        _existing: true,
        material_name: l.material_name,
        resource_id: l.resource_id,
        quantity: String(l.quantity),
        unit: l.unit,
      })),
    );
    setProgress(
      d.progress.map((l) => ({ id: l.id, _existing: true, boq_item_id: l.boq_item_id, quantity: String(l.quantity), label: "" })),
    );
    setIncidents(d.incidents.map((l) => ({ id: l.id, _existing: true, kind: l.kind, severity: l.severity, description: l.description })));
  }, [detail.data]);

  const itemById = React.useMemo(() => new Map((items.data ?? []).map((i) => [i.boq_item_id ?? "", i])), [items.data]);

  if (!isNew && detail.isLoading) return <Skeleton className="h-96" />;

  const scope = { company_id: companyId, project_id: projectId };
  const tradeLabel = (tr: string) => ((TRADES as readonly string[]).includes(tr) ? t(`site.trades.${tr}`) : tr);

  async function copyLastLabour() {
    try {
      const rows = await fetchLastLabour(projectId, date);
      if (!rows.length) return toast.info(t("site.noPreviousLabour"));
      setLabour((prev) => [
        ...prev,
        ...rows.map((r) => ({ id: newId(), trade: r.trade, headcount: String(r.headcount), hours: String(r.hours) })),
      ]);
    } catch {
      toast.error(t("errors.network"));
    }
  }

  async function save(status: "draft" | "submitted") {
    if (!canWrite) return;
    setSaving(true);
    try {
      if (isNew && navigator.onLine) {
        const existing = await fetchReportForDate(projectId, date).catch(() => null);
        if (existing && existing !== id) {
          toast.info(t("site.reportExists"));
          navigate(`/projects/${projectId}/site/report/${existing}`, { replace: true });
          return;
        }
      }
      const label = t("site.reportLabel", { date: date.split("-").reverse().join("/") });
      const opts = { label, companyId };
      const del = (r: { _deleted?: boolean }) => (r._deleted ? { deleted_at: new Date().toISOString() } : {});
      const q = (table: OfflineTable, payload: Record<string, unknown>) => enqueue(table, payload, opts);

      await q("daily_reports", {
        id,
        ...scope,
        report_date: date,
        weather,
        temperature_c: temp ? num(temp) : null,
        summary: summary.trim(),
        status,
      });
      for (const l of labour)
        if (l.trade.trim() && (!l._deleted || l._existing))
          await q("daily_report_labour", {
            id: l.id,
            ...scope,
            daily_report_id: id,
            trade: l.trade.trim(),
            headcount: Math.round(num(l.headcount)),
            hours: num(l.hours),
            ...del(l),
          });
      for (const l of equipment)
        if (l.equipment_name.trim() && (!l._deleted || l._existing))
          await q("daily_report_equipment", {
            id: l.id,
            ...scope,
            daily_report_id: id,
            equipment_name: l.equipment_name.trim(),
            hours: num(l.hours),
            ...del(l),
          });
      for (const l of materials)
        if (l.material_name.trim() && (!l._deleted || l._existing))
          await q("daily_report_materials", {
            id: l.id,
            ...scope,
            daily_report_id: id,
            material_name: l.material_name.trim(),
            resource_id: l.resource_id,
            quantity: num(l.quantity),
            unit: l.unit,
            ...del(l),
          });
      for (const l of progress)
        if (num(l.quantity) !== 0 && (!l._deleted || l._existing))
          await q("progress_entries", {
            id: l.id,
            ...scope,
            daily_report_id: id,
            boq_item_id: l.boq_item_id,
            entry_date: date,
            quantity: num(l.quantity),
            ...del(l),
          });
      for (const l of incidents)
        if (l.description.trim() && (!l._deleted || l._existing))
          await q("incidents", {
            id: l.id,
            ...scope,
            daily_report_id: id,
            kind: l.kind,
            severity: l.severity,
            description: l.description.trim(),
            occurred_at: `${date}T12:00:00Z`,
            ...del(l),
          });
      for (const p of photos)
        await enqueuePhoto(
          p.file,
          { ...scope, daily_report_id: id, caption: p.caption || null, taken_at: new Date().toISOString() },
          t("site.photoLabel", { date: label }),
        );

      toast.success(navigator.onLine ? t("site.savedSyncing") : t("site.savedOffline"));
      await qc.invalidateQueries({ queryKey: ["company", companyId, "site"] });
      navigate(`/projects/${projectId}/site`);
    } finally {
      setSaving(false);
    }
  }

  const section = (icon: React.ReactNode, title: string, body: React.ReactNode, action?: React.ReactNode) => (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 p-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon} {title}
        </CardTitle>
        {action}
      </CardHeader>
      <CardContent className="grid gap-2 p-3 pt-0">{body}</CardContent>
    </Card>
  );
  const removeBtn = (onClick: () => void) => (
    <Button variant="ghost" size="icon" className="size-11 shrink-0" onClick={onClick} aria-label={t("common.remove")}>
      <Trash2 />
    </Button>
  );

  const term = itemSearch.trim().toLowerCase();
  const matches = term ? (items.data ?? []).filter((i) => `${i.code} ${i.description}`.toLowerCase().includes(term)).slice(0, 30) : [];

  return (
    <form
      className="mx-auto grid max-w-2xl gap-3 pb-28"
      onSubmit={(e) => {
        e.preventDefault();
        void save("submitted");
      }}
    >
      <fieldset disabled={!canWrite || saving} className="grid gap-3">
        {section(
          <CloudSun className="size-5 text-accent" aria-hidden />,
          t("site.dayAndWeather"),
          <>
            <div className="grid grid-cols-2 gap-2">
              <DateInput value={date} onChange={(v) => v && setDate(v)} />
              <Input
                value={temp}
                onChange={(e) => setTemp(e.target.value)}
                inputMode="decimal"
                placeholder={t("site.temperature")}
                aria-label={t("site.temperature")}
                className="min-h-touch ltr-nums"
              />
            </div>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("site.weather")}>
              {WEATHER.map((w) => (
                <button
                  key={w}
                  type="button"
                  role="radio"
                  aria-checked={weather === w}
                  onClick={() => setWeather(w)}
                  className={cn(
                    "min-h-touch rounded-full border px-4 text-sm",
                    weather === w ? "border-primary bg-primary text-primary-foreground" : "bg-card",
                  )}
                >
                  {t(`site.weathers.${w}`)}
                </button>
              ))}
            </div>
          </>,
        )}

        {section(
          <HardHat className="size-5 text-accent" aria-hidden />,
          t("site.labour"),
          <>
            {labour.filter((l) => !l._deleted).length === 0 ? <p className="text-sm text-muted-foreground">{t("site.noLabour")}</p> : null}
            {labour.map((l, i) =>
              l._deleted ? null : (
                <div key={l.id} className="flex items-center gap-2">
                  <Input
                    list="tiir-trades"
                    value={tradeLabel(l.trade)}
                    onChange={(e) => setLabour((p) => p.map((x, j) => (j === i ? { ...x, trade: e.target.value } : x)))}
                    placeholder={t("site.trade")}
                    aria-label={t("site.trade")}
                    className="min-h-touch flex-1"
                  />
                  <Input
                    value={l.headcount}
                    onChange={(e) => setLabour((p) => p.map((x, j) => (j === i ? { ...x, headcount: e.target.value } : x)))}
                    inputMode="numeric"
                    aria-label={t("site.headcount")}
                    placeholder={t("site.headcount")}
                    className="min-h-touch w-20 text-center ltr-nums"
                  />
                  <Input
                    value={l.hours}
                    onChange={(e) => setLabour((p) => p.map((x, j) => (j === i ? { ...x, hours: e.target.value } : x)))}
                    inputMode="decimal"
                    aria-label={t("site.hours")}
                    placeholder={t("site.hours")}
                    className="min-h-touch w-16 text-center ltr-nums"
                  />
                  {removeBtn(() => setLabour((p) => p.map((x, j) => (j === i ? { ...x, _deleted: true } : x))))}
                </div>
              ),
            )}
            <datalist id="tiir-trades">
              {TRADES.map((tr) => (
                <option key={tr} value={t(`site.trades.${tr}`)} />
              ))}
            </datalist>
          </>,
          <div className="flex gap-1">
            <Button type="button" variant="ghost" size="sm" onClick={() => void copyLastLabour()}>
              <Copy /> {t("site.copyYesterday")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setLabour((p) => [...p, { id: newId(), trade: "", headcount: "1", hours: "8" }])}
            >
              <Plus /> {t("common.addShort")}
            </Button>
          </div>,
        )}

        {section(
          <Ruler className="size-5 text-accent" aria-hidden />,
          t("site.workDone"),
          <>
            <Input
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              placeholder={t("site.findItem")}
              aria-label={t("site.findItem")}
              className="min-h-touch"
            />
            {matches.length ? (
              <ul className="max-h-56 overflow-y-auto rounded-md border">
                {matches.map((m) => (
                  <li key={m.boq_item_id}>
                    <button
                      type="button"
                      className="flex min-h-touch w-full items-center gap-2 px-2 text-start text-sm hover:bg-muted"
                      onClick={() => {
                        setProgress((p) => [...p, { id: newId(), boq_item_id: m.boq_item_id ?? "", quantity: "", label: "" }]);
                        setItemSearch("");
                      }}
                    >
                      <span className="w-12 shrink-0 font-mono text-xs">{m.code}</span>
                      <span className="flex-1">{m.description}</span>
                      <span className="text-xs text-muted-foreground num">{formatNumber(m.percent_complete, lang, 0)} %</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {progress.map((l, i) => {
              if (l._deleted) return null;
              const it = itemById.get(l.boq_item_id);
              return (
                <div key={l.id} className="flex items-center gap-2 rounded-md border p-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      <span className="font-mono text-xs">{it?.code}</span> {it?.description ?? t("site.unknownItem")}
                    </p>
                    <p className="text-xs text-muted-foreground num">
                      {t("site.doneOf", {
                        done: formatNumber(it?.done_quantity ?? 0, lang, 3),
                        planned: formatNumber(it?.planned_quantity ?? 0, lang, 3),
                        unit: t(`units.${it?.unit ?? "u"}`),
                      })}
                    </p>
                  </div>
                  <Input
                    value={l.quantity}
                    onChange={(e) => setProgress((p) => p.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))}
                    inputMode="decimal"
                    placeholder={t("site.todayQty")}
                    aria-label={t("site.todayQty")}
                    className="min-h-touch w-24 text-end ltr-nums"
                  />
                  {removeBtn(() => setProgress((p) => p.map((x, j) => (j === i ? { ...x, _deleted: true } : x))))}
                </div>
              );
            })}
          </>,
        )}

        {section(
          <Truck className="size-5 text-accent" aria-hidden />,
          t("site.equipment"),
          <>
            {equipment.map((l, i) =>
              l._deleted ? null : (
                <div key={l.id} className="flex items-center gap-2">
                  <Input
                    value={l.equipment_name}
                    onChange={(e) => setEquipment((p) => p.map((x, j) => (j === i ? { ...x, equipment_name: e.target.value } : x)))}
                    placeholder={t("site.equipmentName")}
                    aria-label={t("site.equipmentName")}
                    className="min-h-touch flex-1"
                  />
                  <Input
                    value={l.hours}
                    onChange={(e) => setEquipment((p) => p.map((x, j) => (j === i ? { ...x, hours: e.target.value } : x)))}
                    inputMode="decimal"
                    placeholder={t("site.hours")}
                    aria-label={t("site.hours")}
                    className="min-h-touch w-20 text-center ltr-nums"
                  />
                  {removeBtn(() => setEquipment((p) => p.map((x, j) => (j === i ? { ...x, _deleted: true } : x))))}
                </div>
              ),
            )}
          </>,
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setEquipment((p) => [...p, { id: newId(), equipment_name: "", hours: "8" }])}
          >
            <Plus /> {t("common.addShort")}
          </Button>,
        )}

        {section(
          <Package className="size-5 text-accent" aria-hidden />,
          t("site.materials"),
          <>
            {materials.map((l, i) =>
              l._deleted ? null : (
                <div key={l.id} className="flex flex-wrap items-center gap-2">
                  <Input
                    list="tiir-materials"
                    value={l.material_name}
                    onChange={(e) => {
                      const r = (resources.data ?? []).find((x) => x.name === e.target.value);
                      setMaterials((p) =>
                        p.map((x, j) =>
                          j === i
                            ? {
                                ...x,
                                material_name: e.target.value,
                                resource_id: r?.id ?? null,
                                unit: (r?.unit as UnitCode | undefined) ?? x.unit,
                              }
                            : x,
                        ),
                      );
                    }}
                    placeholder={t("site.material")}
                    aria-label={t("site.material")}
                    className="min-h-touch min-w-40 flex-1"
                  />
                  <Input
                    value={l.quantity}
                    onChange={(e) => setMaterials((p) => p.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))}
                    inputMode="decimal"
                    aria-label={t("estimating.quantity")}
                    placeholder={t("estimating.quantity")}
                    className="min-h-touch w-24 text-end ltr-nums"
                  />
                  <NativeSelect
                    value={l.unit}
                    onChange={(e) => setMaterials((p) => p.map((x, j) => (j === i ? { ...x, unit: e.target.value as UnitCode } : x)))}
                    aria-label={t("estimating.unit")}
                    className="min-h-touch w-24"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {t(`units.${u}`)}
                      </option>
                    ))}
                  </NativeSelect>
                  {removeBtn(() => setMaterials((p) => p.map((x, j) => (j === i ? { ...x, _deleted: true } : x))))}
                </div>
              ),
            )}
            <datalist id="tiir-materials">
              {(resources.data ?? []).map((r) => (
                <option key={r.id} value={r.name ?? ""} />
              ))}
            </datalist>
          </>,
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setMaterials((p) => [...p, { id: newId(), material_name: "", resource_id: null, quantity: "", unit: "u" }])}
          >
            <Plus /> {t("common.addShort")}
          </Button>,
        )}

        {section(
          <Camera className="size-5 text-accent" aria-hidden />,
          t("site.photos"),
          <>
            <label className="flex min-h-touch cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-dashed text-sm font-medium">
              <Camera className="size-5" /> {t("site.takePhoto")}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                className="sr-only"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  setPhotos((p) => [...p, ...files.map((file) => ({ id: newId(), file, url: URL.createObjectURL(file), caption: "" }))]);
                  e.target.value = "";
                }}
              />
            </label>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((p, i) => (
                <div key={p.id} className="relative">
                  <img src={p.url} alt={p.caption || t("site.photo")} className="aspect-square w-full rounded-md object-cover" />
                  <button
                    type="button"
                    className="absolute end-1 top-1 rounded-full bg-black/60 p-1 text-white"
                    onClick={() => setPhotos((x) => x.filter((_, j) => j !== i))}
                    aria-label={t("common.remove")}
                  >
                    <X className="size-4" />
                  </button>
                  <Input
                    value={p.caption}
                    onChange={(e) => setPhotos((x) => x.map((y, j) => (j === i ? { ...y, caption: e.target.value } : y)))}
                    placeholder={t("site.caption")}
                    aria-label={t("site.caption")}
                    className="mt-1 h-8 text-xs"
                  />
                </div>
              ))}
            </div>
            {detail.data?.photos.length ? (
              <p className="text-xs text-muted-foreground">{t("site.existingPhotos", { count: detail.data.photos.length })}</p>
            ) : null}
          </>,
        )}

        {section(
          <ShieldAlert className="size-5 text-accent" aria-hidden />,
          t("site.incidents"),
          <>
            {incidents.map((l, i) =>
              l._deleted ? null : (
                <div key={l.id} className="grid gap-2 rounded-md border p-2">
                  <div className="flex gap-2">
                    <NativeSelect
                      value={l.kind}
                      onChange={(e) => setIncidents((p) => p.map((x, j) => (j === i ? { ...x, kind: e.target.value } : x)))}
                      aria-label={t("site.incidentKind")}
                      className="min-h-touch"
                    >
                      {["injury", "near_miss", "damage", "theft", "environment", "other"].map((k) => (
                        <option key={k} value={k}>
                          {t(`site.incidentKinds.${k}`)}
                        </option>
                      ))}
                    </NativeSelect>
                    <NativeSelect
                      value={l.severity}
                      onChange={(e) => setIncidents((p) => p.map((x, j) => (j === i ? { ...x, severity: e.target.value } : x)))}
                      aria-label={t("site.severity")}
                      className="min-h-touch"
                    >
                      {["low", "medium", "high", "critical"].map((k) => (
                        <option key={k} value={k}>
                          {t(`site.severities.${k}`)}
                        </option>
                      ))}
                    </NativeSelect>
                    {removeBtn(() => setIncidents((p) => p.map((x, j) => (j === i ? { ...x, _deleted: true } : x))))}
                  </div>
                  <Textarea
                    value={l.description}
                    onChange={(e) => setIncidents((p) => p.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))}
                    placeholder={t("site.whatHappened")}
                    aria-label={t("site.whatHappened")}
                    rows={2}
                  />
                </div>
              ),
            )}
          </>,
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setIncidents((p) => [...p, { id: newId(), kind: "near_miss", severity: "low", description: "" }])}
          >
            <Plus /> {t("common.addShort")}
          </Button>,
        )}

        <Card>
          <CardContent className="p-3">
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder={t("site.summaryPlaceholder")}
              aria-label={t("site.summary")}
              rows={3}
            />
          </CardContent>
        </Card>
      </fieldset>

      {canWrite ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 p-3 backdrop-blur lg:start-60">
          <div className="mx-auto flex max-w-2xl gap-2">
            <Button type="button" variant="outline" size="touch" className="flex-1" disabled={saving} onClick={() => void save("draft")}>
              {t("site.saveDraft")}
            </Button>
            <Button type="submit" size="touch" className="flex-1" disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : <Send />} {t("site.submitReport")}
            </Button>
          </div>
        </div>
      ) : null}
    </form>
  );
}
