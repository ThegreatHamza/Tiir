import * as React from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { Checkbox } from "@/components/ui/checkbox";
import { DateInput } from "@/components/common/DateInput";
import { cn } from "@/lib/utils";
import type { CurrencyCode } from "@/lib/calc/money";
import { RelationSelect } from "./RelationSelect";
import { FileField } from "./FileField";
import { formToPayload, rowToForm, type FieldError, type FormValues } from "./values";
import type { FieldDef } from "./types";

export function CrudForm({
  open,
  onOpenChange,
  title,
  description,
  fields,
  row,
  currency,
  companyId,
  projectId,
  readOnly,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  fields: FieldDef[];
  row: Record<string, unknown> | null;
  currency: CurrencyCode;
  companyId: string;
  projectId?: string;
  readOnly?: boolean;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [values, setValues] = React.useState<FormValues>(() => rowToForm(fields, row));
  const [errors, setErrors] = React.useState<FieldError[]>([]);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setValues(rowToForm(fields, row));
      setErrors([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, row]);

  const set = (name: string, v: string | boolean) => setValues((prev) => ({ ...prev, [name]: v }));
  const errorFor = (name: string) => {
    const e = errors.find((x) => x.field === name);
    return e ? t(`validation.${e.code === "min" || e.code === "max" ? "outOfRange" : e.code}`) : undefined;
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const { payload, errors: errs } = formToPayload(fields, values, currency);
    setErrors(errs);
    if (errs.length) return;
    setBusy(true);
    try {
      await onSubmit(payload);
      onOpenChange(false);
    } catch {
      /* the caller shows the error */
    } finally {
      setBusy(false);
    }
  }

  const control = (f: FieldDef, id: string) => {
    const disabled = readOnly || f.readOnly;
    const v = values[f.name];
    const str = typeof v === "string" ? v : "";
    switch (f.type) {
      case "textarea":
        return <Textarea rows={3} value={str} onChange={(e) => set(f.name, e.target.value)} disabled={disabled} />;
      case "number":
      case "money":
      case "percent":
        return (
          <Input
            inputMode="decimal"
            value={str}
            onChange={(e) => set(f.name, e.target.value)}
            disabled={disabled}
            className="text-end ltr-nums"
          />
        );
      case "date":
        return <DateInput value={str} onChange={(iso) => set(f.name, iso)} disabled={disabled} />;
      case "select":
        return (
          <NativeSelect value={str} onChange={(e) => set(f.name, e.target.value)} disabled={disabled}>
            {!f.required ? <option value="">{t("common.none")}</option> : null}
            {(f.options ?? []).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </NativeSelect>
        );
      case "relation":
        return (
          <RelationSelect
            field={f}
            companyId={companyId}
            projectId={projectId}
            value={str}
            onChange={(x) => set(f.name, x)}
            disabled={disabled}
            id={id}
          />
        );
      case "file":
        return (
          <FileField
            value={str}
            onChange={(p) => set(f.name, p)}
            companyId={companyId}
            projectId={projectId}
            module={f.module ?? "files"}
            accept={f.accept}
            compress={f.compress !== false}
            disabled={disabled}
            id={id}
          />
        );
      case "checkbox":
        return (
          <label className="flex min-h-9 items-center gap-2 text-sm">
            <Checkbox checked={v === true} onCheckedChange={(c) => set(f.name, c === true)} disabled={disabled} />
            {f.hint ?? f.label}
          </label>
        );
      default:
        return <Input value={str} onChange={(e) => set(f.name, e.target.value)} disabled={disabled} />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : (
            <DialogDescription className="sr-only">{title}</DialogDescription>
          )}
        </DialogHeader>
        <form className="grid gap-4" noValidate onSubmit={(e) => void submit(e)}>
          <div className="grid gap-4 sm:grid-cols-3">
            {fields
              .filter((f) => !f.visible || f.visible(values))
              .map((f) => {
                const id = `crud-${f.name}`;
                const span = f.span ?? (f.type === "textarea" || f.type === "file" ? 3 : 1);
                return (
                  <FormField
                    key={f.name}
                    id={id}
                    label={f.type === "checkbox" ? "" : f.label}
                    required={f.required}
                    error={errorFor(f.name)}
                    hint={f.type === "checkbox" ? undefined : f.hint}
                    className={cn(span === 2 && "sm:col-span-2", span === 3 && "sm:col-span-3", f.type === "checkbox" && "self-end")}
                  >
                    {control(f, id)}
                  </FormField>
                );
              })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {readOnly ? t("common.close") : t("common.cancel")}
            </Button>
            {!readOnly ? (
              <Button type="submit" disabled={busy}>
                {busy ? <Loader2 className="animate-spin" /> : null}
                {row ? t("common.save") : t("common.create")}
              </Button>
            ) : null}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
