import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useCurrentCompany } from "@/features/companies/CompanyProvider";
import { formatMoney } from "@/lib/format";
import type { CurrencyCode } from "@/lib/calc/money";
import { currentLanguage } from "@/i18n";
import { searchResources } from "./api";

export type PickedResource = Awaited<ReturnType<typeof searchResources>>[number];

/** Search the price library (same currency as the project) and pick a resource. */
export function ResourcePicker({
  currency,
  onPick,
  disabled,
}: {
  currency: CurrencyCode;
  onPick: (r: PickedResource) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const { companyId } = useCurrentCompany();
  const [term, setTerm] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const listId = React.useId();

  React.useEffect(() => {
    const id = window.setTimeout(() => setDebounced(term), 250);
    return () => window.clearTimeout(id);
  }, [term]);

  const query = useQuery({
    queryKey: ["company", companyId, "price-resources", "search", currency, debounced],
    queryFn: () => searchResources(companyId, currency, debounced),
    enabled: open,
  });

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <Input
        value={term}
        disabled={disabled}
        onChange={(e) => {
          setTerm(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        placeholder={t("estimating.upa.searchLibrary", { currency })}
        aria-label={t("estimating.upa.searchLibrary", { currency })}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        className="ps-8"
      />
      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-md"
        >
          {query.isLoading ? (
            <li className="flex justify-center p-3">
              <Loader2 className="size-4 animate-spin" />
            </li>
          ) : (query.data ?? []).length === 0 ? (
            <li className="p-3 text-center text-sm text-muted-foreground">{t("estimating.upa.noResources", { currency })}</li>
          ) : (
            (query.data ?? []).map((r) => (
              <li key={r.id} role="option" aria-selected={false}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-start text-sm hover:bg-muted"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onPick(r);
                    setTerm("");
                    setOpen(false);
                  }}
                >
                  <span className="w-20 shrink-0 font-mono text-xs text-muted-foreground ltr-nums">{r.code}</span>
                  <span className="flex-1 truncate">{r.name}</span>
                  <Badge variant="secondary">{t(`estimating.kinds.${r.kind}`)}</Badge>
                  <span className="shrink-0 num">
                    {formatMoney(r.unit_cost, r.currency, lang)}/{t(`units.${r.unit}`)}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
