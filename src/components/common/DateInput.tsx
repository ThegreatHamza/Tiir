import * as React from "react";
import { useTranslation } from "react-i18next";
import { CalendarDays } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatDate, parseDate } from "@/lib/format";

/**
 * Date field that always reads and writes dd/mm/yyyy, whatever the browser
 * locale. Value in/out is ISO "YYYY-MM-DD" (or "" when empty). The calendar
 * button opens the device's native picker (good on Android).
 */
export const DateInput = React.forwardRef<
  HTMLInputElement,
  {
    value: string | null | undefined;
    onChange: (iso: string) => void;
    id?: string;
    disabled?: boolean;
    "aria-invalid"?: boolean;
    "aria-describedby"?: string;
  }
>(({ value, onChange, id, disabled, ...aria }, ref) => {
  const { t } = useTranslation();
  const [text, setText] = React.useState(value ? formatDate(value) : "");
  const nativeRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setText(value ? formatDate(value) : "");
  }, [value]);

  return (
    <div className="relative">
      <Input
        ref={ref}
        id={id}
        disabled={disabled}
        inputMode="numeric"
        placeholder={t("common.datePlaceholder")}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          if (!text.trim()) {
            onChange("");
            return;
          }
          const iso = parseDate(text);
          if (iso) onChange(iso);
          else setText(value ? formatDate(value) : "");
        }}
        className="pe-10 ltr-nums"
        {...aria}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          const el = nativeRef.current;
          if (!el) return;
          if (typeof el.showPicker === "function") el.showPicker();
          else el.click();
        }}
        className="absolute end-1 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-muted"
        aria-label={t("common.openCalendar")}
      >
        <CalendarDays className="size-4" />
      </button>
      <input
        ref={nativeRef}
        type="date"
        tabIndex={-1}
        aria-hidden
        className="pointer-events-none absolute bottom-0 end-0 h-0 w-0 opacity-0"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
});
DateInput.displayName = "DateInput";
