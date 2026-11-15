import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DateInput } from "@/components/common/DateInput";
import { ErrorState } from "@/components/common/States";
import { EditableCell } from "@/features/estimating/EditableCell";
import { useCurrentCompany } from "@/features/companies/CompanyProvider";
import { supabase } from "@/lib/supabase";
import { errorMessage } from "@/lib/errors";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const DAYS = [6, 7, 1, 2, 3, 4, 5];

/** Working calendars (week pattern + public holidays) used by project schedules. */
export function CalendarsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { companyId, role } = useCurrentCompany();
  const canWrite = role === "owner" || role === "admin" || role === "project_manager";
  const key = ["company", companyId, "calendars"];
  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const [{ data: cals, error }, { data: hols, error: e2 }] = await Promise.all([
        supabase.from("calendars").select("*").eq("company_id", companyId).is("deleted_at", null).order("created_at"),
        supabase.from("holidays").select("*").eq("company_id", companyId).is("deleted_at", null).order("date"),
      ]);
      if (error ?? e2) throw error ?? e2;
      return { cals: cals ?? [], hols: hols ?? [] };
    },
  });
  const [newName, setNewName] = React.useState("");
  const [holiday, setHoliday] = React.useState<Record<string, { date: string; name: string }>>({});
  const refresh = () => void qc.invalidateQueries({ queryKey: ["company", companyId] });
  const act = async (p: PromiseLike<{ error: unknown }>) => {
    const { error } = await p;
    if (error) toast.error(errorMessage(t, error));
    else refresh();
  };

  if (query.isLoading) return <Skeleton className="h-64" />;
  if (query.error) return <ErrorState message={errorMessage(t, query.error)} onRetry={() => void query.refetch()} />;

  return (
    <>
      <PageHeader title={t("calendars.title")} description={t("calendars.subtitle")} />
      <div className="grid gap-4">
        {query.data?.cals.map((c) => (
          <Card key={c.id}>
            <CardHeader className="flex-row flex-wrap items-center gap-2 space-y-0">
              <CardTitle className="flex-1">
                <EditableCell
                  value={c.name}
                  label={t("common.name")}
                  readOnly={!canWrite}
                  allowEmpty={false}
                  onCommit={(v) =>
                    act(
                      supabase
                        .from("calendars")
                        .update({ name: String(v) })
                        .eq("id", c.id),
                    )
                  }
                />
              </CardTitle>
              {c.is_default ? (
                <Badge variant="accent">
                  <Star className="me-1 size-3" /> {t("calendars.default")}
                </Badge>
              ) : canWrite ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    await supabase.from("calendars").update({ is_default: false }).eq("company_id", companyId).eq("is_default", true);
                    await act(supabase.from("calendars").update({ is_default: true }).eq("id", c.id));
                  }}
                >
                  <Star /> {t("calendars.makeDefault")}
                </Button>
              ) : null}
              {canWrite && !c.is_default ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => void act(supabase.from("calendars").update({ deleted_at: new Date().toISOString() }).eq("id", c.id))}
                  aria-label={t("common.delete")}
                >
                  <Trash2 />
                </Button>
              ) : null}
            </CardHeader>
            <CardContent className="grid gap-4">
              <fieldset className="flex flex-wrap gap-2" disabled={!canWrite}>
                <legend className="mb-2 text-sm font-medium">{t("calendars.workingDays")}</legend>
                {DAYS.map((d) => {
                  const on = c.working_days.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={on}
                      onClick={() => {
                        const next = on ? c.working_days.filter((x) => x !== d) : [...c.working_days, d];
                        if (next.length === 0) return;
                        void act(supabase.from("calendars").update({ working_days: next }).eq("id", c.id));
                      }}
                      className={cn(
                        "min-h-10 min-w-14 rounded-md border px-3 text-sm",
                        on ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground",
                      )}
                    >
                      {t(`calendars.days.${d}`)}
                    </button>
                  );
                })}
              </fieldset>
              <div className="grid gap-2">
                <p className="text-sm font-medium">{t("calendars.holidays")}</p>
                <ul className="divide-y rounded-md border">
                  {query.data.hols
                    .filter((h) => h.calendar_id === c.id)
                    .map((h) => (
                      <li key={h.id} className="flex items-center gap-2 px-3 py-1.5 text-sm">
                        <span className="w-24 num">{formatDate(h.date)}</span>
                        <span className="flex-1">{h.name}</span>
                        {canWrite ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() =>
                              void act(supabase.from("holidays").update({ deleted_at: new Date().toISOString() }).eq("id", h.id))
                            }
                            aria-label={t("common.delete")}
                          >
                            <Trash2 />
                          </Button>
                        ) : null}
                      </li>
                    ))}
                  {query.data.hols.every((h) => h.calendar_id !== c.id) ? (
                    <li className="px-3 py-2 text-sm text-muted-foreground">{t("calendars.noHolidays")}</li>
                  ) : null}
                </ul>
                {canWrite ? (
                  <div className="flex flex-wrap gap-2">
                    <div className="w-40">
                      <DateInput
                        value={holiday[c.id]?.date ?? ""}
                        onChange={(v) => setHoliday((p) => ({ ...p, [c.id]: { date: v, name: p[c.id]?.name ?? "" } }))}
                      />
                    </div>
                    <Input
                      value={holiday[c.id]?.name ?? ""}
                      onChange={(e) => setHoliday((p) => ({ ...p, [c.id]: { date: p[c.id]?.date ?? "", name: e.target.value } }))}
                      placeholder={t("calendars.holidayName")}
                      aria-label={t("calendars.holidayName")}
                      className="w-60"
                    />
                    <Button
                      variant="secondary"
                      disabled={!holiday[c.id]?.date || !holiday[c.id]?.name}
                      onClick={async () => {
                        const h = holiday[c.id];
                        if (!h) return;
                        await act(
                          supabase.from("holidays").insert({ company_id: companyId, calendar_id: c.id, date: h.date, name: h.name }),
                        );
                        setHoliday((p) => ({ ...p, [c.id]: { date: "", name: "" } }));
                      }}
                    >
                      <Plus /> {t("common.addShort")}
                    </Button>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ))}
        {canWrite ? (
          <div className="flex gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t("calendars.newName")}
              aria-label={t("calendars.newName")}
              className="max-w-sm"
            />
            <Button
              disabled={!newName.trim()}
              onClick={async () => {
                await act(supabase.from("calendars").insert({ company_id: companyId, name: newName.trim() }));
                setNewName("");
              }}
            >
              <Plus /> {t("calendars.add")}
            </Button>
          </div>
        ) : null}
      </div>
    </>
  );
}
