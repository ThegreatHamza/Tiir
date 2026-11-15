import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { DateInput } from "@/components/common/DateInput";
import { useCurrentCompany } from "@/features/companies/CompanyProvider";
import { fetchClientOptions } from "@/features/clients/api";
import { can } from "@/lib/roles";
import { qk } from "@/lib/queryKeys";
import { CURRENCIES } from "@/lib/calc/money";
import { PROJECT_STATUSES, type ProjectRow } from "./api";

const optionalText = z.string().trim().max(500).optional().or(z.literal(""));

function makeSchema(t: (k: string) => string) {
  return z
    .object({
      code: z.string().trim().min(1, t("validation.required")).max(40),
      name: z.string().trim().min(1, t("validation.required")).max(200),
      client_id: z.string().optional(),
      status: z.enum(["draft", "tender", "active", "on_hold", "completed", "cancelled"]),
      currency: z.enum(["DJF", "ETB", "USD"]),
      country: z.enum(["DJ", "ET"]),
      city: optionalText,
      site_address: optionalText,
      start_date: z.string().optional(),
      end_date: z.string().optional(),
      description: z.string().trim().max(4000).optional(),
    })
    .refine((v) => !v.start_date || !v.end_date || v.end_date >= v.start_date, {
      message: t("validation.endAfterStart"),
      path: ["end_date"],
    });
}

export type ProjectFormValues = z.infer<ReturnType<typeof makeSchema>>;

export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  project?: ProjectRow | null;
  onSubmit: (values: ProjectFormValues) => Promise<void>;
}) {
  const { t } = useTranslation();
  const { company, companyId, role } = useCurrentCompany();
  const schema = makeSchema(t);
  const clients = useQuery({
    queryKey: qk.clientOptions(companyId),
    queryFn: () => fetchClientOptions(companyId),
    enabled: open && can.seeClients(role),
  });

  const defaults = (): ProjectFormValues => ({
    code: project?.code ?? "",
    name: project?.name ?? "",
    client_id: project?.client_id ?? "",
    status: project?.status ?? "draft",
    currency: project?.currency ?? company.default_currency,
    country: project?.country ?? company.country,
    city: project?.city ?? "",
    site_address: project?.site_address ?? "",
    start_date: project?.start_date ?? "",
    end_date: project?.end_date ?? "",
    description: project?.description ?? "",
  });

  const form = useForm<ProjectFormValues>({ resolver: zodResolver(schema), defaultValues: defaults() });
  useEffect(() => {
    if (open) form.reset(defaults());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, project?.id]);

  const { errors, isSubmitting } = form.formState;
  const editing = Boolean(project);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? t("projects.edit") : t("projects.new")}</DialogTitle>
          <DialogDescription>{editing ? t("projects.editHint") : t("projects.newHint")}</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          noValidate
          onSubmit={form.handleSubmit(async (v) => {
            try {
              await onSubmit(v);
            } catch {
              /* the caller shows the error */
            }
          })}
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField id="p-code" label={t("common.code")} error={errors.code?.message} required>
              <Input {...form.register("code")} className="ltr-nums" />
            </FormField>
            <FormField id="p-name" label={t("common.name")} error={errors.name?.message} required className="sm:col-span-2">
              <Input {...form.register("name")} />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {can.seeClients(role) ? (
              <FormField id="p-client" label={t("projects.client")}>
                <NativeSelect {...form.register("client_id")}>
                  <option value="">{t("projects.noClient")}</option>
                  {(clients.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </NativeSelect>
              </FormField>
            ) : null}
            <FormField id="p-status" label={t("common.status")}>
              <NativeSelect {...form.register("status")}>
                {PROJECT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(`projects.statuses.${s}`)}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField
              id="p-currency"
              label={t("common.currency")}
              hint={editing ? t("projects.currencyLocked") : t("projects.currencyHint")}
            >
              <NativeSelect {...form.register("currency")} disabled={editing}>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {t(`currencies.${c}`)}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField id="p-country" label={t("common.country")}>
              <NativeSelect {...form.register("country")}>
                <option value="DJ">{t("countries.DJ")}</option>
                <option value="ET">{t("countries.ET")}</option>
              </NativeSelect>
            </FormField>
            <FormField id="p-city" label={t("common.city")}>
              <Input {...form.register("city")} />
            </FormField>
            <FormField id="p-address" label={t("projects.siteAddress")}>
              <Input {...form.register("site_address")} />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="p-start" label={t("common.startDate")}>
              <Controller
                control={form.control}
                name="start_date"
                render={({ field }) => <DateInput value={field.value} onChange={field.onChange} />}
              />
            </FormField>
            <FormField id="p-end" label={t("common.endDate")} error={errors.end_date?.message}>
              <Controller
                control={form.control}
                name="end_date"
                render={({ field }) => <DateInput value={field.value} onChange={field.onChange} />}
              />
            </FormField>
          </div>
          <FormField id="p-description" label={t("common.description")}>
            <Textarea rows={3} {...form.register("description")} />
          </FormField>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : null}
              {editing ? t("common.save") : t("common.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
