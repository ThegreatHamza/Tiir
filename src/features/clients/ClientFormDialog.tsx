import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Client } from "./api";

export function ClientFormDialog({
  open,
  onOpenChange,
  client,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  client: Client | null;
  onSubmit: (v: ClientFormValues) => Promise<void>;
}) {
  const { t } = useTranslation();
  const schema = z.object({
    name: z.string().trim().min(1, t("validation.required")).max(200),
    contact_name: z.string().trim().max(200),
    email: z.union([z.literal(""), z.string().trim().email(t("validation.email"))]),
    phone: z.string().trim().max(40),
    address: z.string().trim().max(500),
    tax_id: z.string().trim().max(60),
    notes: z.string().trim().max(4000),
  });
  const defaults = () => ({
    name: client?.name ?? "",
    contact_name: client?.contact_name ?? "",
    email: client?.email ?? "",
    phone: client?.phone ?? "",
    address: client?.address ?? "",
    tax_id: client?.tax_id ?? "",
    notes: client?.notes ?? "",
  });
  const form = useForm<ClientFormValues>({ resolver: zodResolver(schema), defaultValues: defaults() });
  useEffect(() => {
    if (open) form.reset(defaults());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, client?.id]);
  const { errors, isSubmitting } = form.formState;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{client ? t("clients.edit") : t("clients.new")}</DialogTitle>
          <DialogDescription>{t("clients.formHint")}</DialogDescription>
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
          <FormField id="c-name" label={t("common.name")} error={errors.name?.message} required>
            <Input {...form.register("name")} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="c-contact" label={t("clients.contactName")}>
              <Input {...form.register("contact_name")} />
            </FormField>
            <FormField id="c-tax" label={t("common.taxId")}>
              <Input {...form.register("tax_id")} className="ltr-nums" />
            </FormField>
            <FormField id="c-email" label={t("auth.email")} error={errors.email?.message}>
              <Input type="email" inputMode="email" {...form.register("email")} />
            </FormField>
            <FormField id="c-phone" label={t("common.phone")}>
              <Input type="tel" inputMode="tel" {...form.register("phone")} className="ltr-nums" />
            </FormField>
          </div>
          <FormField id="c-address" label={t("common.address")}>
            <Input {...form.register("address")} />
          </FormField>
          <FormField id="c-notes" label={t("common.notes")}>
            <Textarea rows={3} {...form.register("notes")} />
          </FormField>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : null}
              {client ? t("common.save") : t("common.create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export type ClientFormValues = {
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
  tax_id: string;
  notes: string;
};
