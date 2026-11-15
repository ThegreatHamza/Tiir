import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { errorMessage } from "@/lib/errors";
import { parseAmount } from "@/lib/import/priceResources";
import { createVersion, setCurrentVersion, updateVersion, type BoqVersion } from "./api";

export function NewVersionDialog({
  open,
  onOpenChange,
  projectId,
  versions,
  defaultSourceId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projectId: string;
  versions: BoqVersion[];
  defaultSourceId: string | null;
  onCreated: (id: string) => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [source, setSource] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setSource(defaultSourceId ?? "");
    }
  }, [open, defaultSourceId]);

  async function submit() {
    setBusy(true);
    try {
      const id = await createVersion(projectId, name.trim(), source || null);
      toast.success(t("estimating.versions.created"));
      onCreated(id);
      onOpenChange(false);
    } catch (e) {
      toast.error(errorMessage(t, e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("estimating.versions.new")}</DialogTitle>
          <DialogDescription>{t("estimating.versions.newHint")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <FormField id="v-name" label={t("common.name")} hint={t("estimating.versions.nameHint")}>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </FormField>
          <FormField id="v-source" label={t("estimating.versions.startFrom")}>
            <NativeSelect value={source} onChange={(e) => setSource(e.target.value)}>
              <option value="">{t("estimating.versions.empty")}</option>
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {t("estimating.versions.copyOf", { label: `V${v.number} — ${v.name}` })}
                </option>
              ))}
            </NativeSelect>
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={() => void submit()} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : null}
            {t("common.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function VersionSettingsDialog({
  version,
  onOpenChange,
  onSaved,
}: {
  version: BoqVersion | null;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [coef, setCoef] = useState("");
  const [status, setStatus] = useState<BoqVersion["status"]>("draft");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!version) return;
    setName(version.name);
    setCoef(String(version.coefficient));
    setStatus(version.status);
    setNotes(version.notes ?? "");
    setError(null);
  }, [version]);

  if (!version) return null;
  const locked = version.status !== "draft";
  const statuses: BoqVersion["status"][] = version.status === "approved" ? ["approved"] : ["draft", "submitted", "approved"];

  async function save() {
    if (!version) return;
    const c = parseAmount(coef);
    if (!name.trim()) return setError(t("validation.required"));
    if (c === null || c <= 0) return setError(t("validation.positive"));
    setBusy(true);
    setError(null);
    try {
      await updateVersion(version.id, { name: name.trim(), notes: notes.trim() || null, status, ...(locked ? {} : { coefficient: c }) });
      toast.success(t("common.saved"));
      onSaved();
      onOpenChange(false);
    } catch (e) {
      setError(errorMessage(t, e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("estimating.versions.settings", { number: version.number })}</DialogTitle>
          <DialogDescription>{t("estimating.versions.settingsHint")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <FormField id="vs-name" label={t("common.name")} required>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField
              id="vs-coef"
              label={t("settings.priceCoefficient")}
              hint={locked ? t("estimating.versions.coefLocked") : t("settings.priceCoefficientHint")}
            >
              <Input value={coef} onChange={(e) => setCoef(e.target.value)} inputMode="decimal" disabled={locked} className="ltr-nums" />
            </FormField>
            <FormField id="vs-status" label={t("common.status")} hint={t("estimating.versions.statusHint")}>
              <NativeSelect value={status} onChange={(e) => setStatus(e.target.value as BoqVersion["status"])}>
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {t(`estimating.versions.statuses.${s}`)}
                  </option>
                ))}
              </NativeSelect>
            </FormField>
          </div>
          <FormField id="vs-notes" label={t("common.notes")}>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </FormField>
          {!version.is_current ? (
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await setCurrentVersion(version.id);
                  toast.success(t("estimating.versions.nowCurrent"));
                  onSaved();
                } catch (e) {
                  toast.error(errorMessage(t, e));
                }
              }}
            >
              <Star /> {t("estimating.versions.makeCurrent")}
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">{t("estimating.versions.isCurrentHint")}</p>
          )}
        </div>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={() => void save()} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : null}
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
