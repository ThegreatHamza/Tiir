import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCurrentCompany } from "@/features/companies/CompanyProvider";
import { parsePriceResources, type ImportResult } from "@/lib/import/priceResources";
import { formatMoney } from "@/lib/format";
import { currentLanguage } from "@/i18n";
import { errorMessage } from "@/lib/errors";
import { exportToExcel } from "@/lib/export/excel";
import { importResources } from "./api";

const MAX_BYTES = 10 * 1024 * 1024;

export function ImportResourcesDialog({
  open,
  onOpenChange,
  onImported,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onImported: () => void;
}) {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const { company, companyId } = useCurrentCompany();
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);

  function reset() {
    setFileName(null);
    setResult(null);
  }

  async function read(file: File) {
    if (file.size > MAX_BYTES) return toast.error(t("estimating.import.tooLarge"));
    setBusy(true);
    try {
      const { read: readWorkbook, utils } = await import("xlsx");
      const wb = readWorkbook(await file.arrayBuffer(), { type: "array", cellDates: false, dense: true });
      const first = wb.SheetNames[0];
      const sheet = first ? wb.Sheets[first] : undefined;
      if (!sheet) throw new Error("empty workbook");
      const rows = utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: null, blankrows: false });
      setFileName(file.name);
      setResult(parsePriceResources(rows, company.default_currency));
    } catch {
      toast.error(t("estimating.import.unreadable"));
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!result?.rows.length) return;
    setBusy(true);
    try {
      const res = await importResources(companyId, result.rows);
      toast.success(t("estimating.import.done", { inserted: res.inserted, updated: res.updated }));
      onImported();
      reset();
      onOpenChange(false);
    } catch (e) {
      toast.error(errorMessage(t, e));
    } finally {
      setBusy(false);
    }
  }

  async function downloadTemplate() {
    const sample = [
      {
        code: "CIM-01",
        name: t("estimating.import.sampleCement"),
        kind: t("estimating.kinds.material"),
        unit: "t",
        cost: 25000,
        cur: company.default_currency,
      },
      {
        code: "MO-MAC",
        name: t("estimating.import.sampleMason"),
        kind: t("estimating.kinds.labour"),
        unit: "h",
        cost: 500,
        cur: company.default_currency,
      },
    ];
    await exportToExcel(
      t("estimating.import.templateName"),
      t("estimating.resources.title"),
      [
        { header: t("common.code"), value: (r: (typeof sample)[number]) => r.code },
        { header: t("estimating.designation"), value: (r) => r.name, width: 32 },
        { header: t("estimating.resources.kind"), value: (r) => r.kind, width: 16 },
        { header: t("estimating.unit"), value: (r) => r.unit },
        { header: t("estimating.unitCost"), value: (r) => r.cost, width: 14 },
        { header: t("common.currency"), value: (r) => r.cur },
        { header: t("estimating.resources.supplier"), value: () => "", width: 20 },
      ],
      sample,
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("estimating.import.title")}</DialogTitle>
          <DialogDescription>{t("estimating.import.hint")}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex">
            <input
              type="file"
              accept=".xlsx,.xls,.csv,.ods"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void read(f);
                e.target.value = "";
              }}
            />
            <span className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90">
              {busy && !result ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
              {t("estimating.import.chooseFile")}
            </span>
          </label>
          <Button variant="ghost" onClick={() => void downloadTemplate()}>
            <FileSpreadsheet /> {t("estimating.import.template")}
          </Button>
          {fileName ? <span className="text-sm text-muted-foreground">{fileName}</span> : null}
        </div>

        {result ? (
          <div className="grid gap-3">
            <p className="text-sm">
              {t("estimating.import.summary", { valid: result.rows.length, errors: new Set(result.errors.map((e) => e.row)).size })}
            </p>
            {result.errors.length ? (
              <ul className="max-h-32 overflow-y-auto rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs">
                {result.errors.slice(0, 200).map((e, i) => (
                  <li key={i}>
                    {e.field === "row"
                      ? t("estimating.import.noHeader")
                      : t("estimating.import.error", {
                          row: e.row,
                          field: t(`estimating.import.fields.${e.field}`),
                          reason: t(`estimating.import.reasons.${e.reason}`),
                        })}
                  </li>
                ))}
              </ul>
            ) : null}
            {result.rows.length ? (
              <div className="max-h-64 overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("common.code")}</TableHead>
                      <TableHead>{t("estimating.designation")}</TableHead>
                      <TableHead>{t("estimating.resources.kind")}</TableHead>
                      <TableHead>{t("estimating.unit")}</TableHead>
                      <TableHead className="text-end">{t("estimating.unitCost")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.rows.slice(0, 100).map((r) => (
                      <TableRow key={r.code}>
                        <TableCell className="font-mono text-xs ltr-nums">{r.code}</TableCell>
                        <TableCell>{r.name}</TableCell>
                        <TableCell>{t(`estimating.kinds.${r.kind}`)}</TableCell>
                        <TableCell>{t(`units.${r.unit}`)}</TableCell>
                        <TableCell className="text-end num">{formatMoney(r.unit_cost, r.currency, lang)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : null}
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={() => void confirm()} disabled={busy || !result?.rows.length}>
            {busy && result ? <Loader2 className="animate-spin" /> : null}
            {t("estimating.import.confirm", { count: result?.rows.length ?? 0 })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
