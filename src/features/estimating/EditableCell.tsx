import * as React from "react";
import { cn } from "@/lib/utils";
import { parseAmount } from "@/lib/import/priceResources";

/**
 * Spreadsheet-like cell: shows text, turns into an input on click/Enter,
 * commits on blur or Enter, Escape cancels. Cheap to render in large BoQs.
 */
export function EditableCell({
  value,
  display,
  onCommit,
  type = "text",
  readOnly,
  label,
  className,
  inputClassName,
  multiline,
  allowEmpty = true,
}: {
  value: string | number | null;
  display?: React.ReactNode;
  onCommit: (v: string | number | null) => Promise<void> | void;
  type?: "text" | "number";
  readOnly?: boolean;
  label: string;
  className?: string;
  inputClassName?: string;
  multiline?: boolean;
  allowEmpty?: boolean;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [invalid, setInvalid] = React.useState(false);
  const ref = React.useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (editing) {
      ref.current?.focus();
      ref.current?.select();
    }
  }, [editing]);

  const start = () => {
    if (readOnly) return;
    setDraft(value === null || value === undefined ? "" : String(value));
    setInvalid(false);
    setEditing(true);
  };

  const commit = async () => {
    let next: string | number | null;
    const raw = draft.trim();
    if (type === "number") {
      if (raw === "") next = allowEmpty ? null : 0;
      else {
        const n = parseAmount(raw);
        if (n === null || n < 0) {
          setInvalid(true);
          return;
        }
        next = n;
      }
    } else {
      if (!raw && !allowEmpty) {
        setInvalid(true);
        return;
      }
      next = raw;
    }
    setEditing(false);
    if (next !== value && !(next === "" && (value === null || value === ""))) await onCommit(next);
  };

  if (editing) {
    const common = {
      ref,
      value: draft,
      "aria-label": label,
      "aria-invalid": invalid,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setDraft(e.target.value);
        setInvalid(false);
      },
      onBlur: () => void commit(),
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === "Escape") {
          e.preventDefault();
          setEditing(false);
        } else if (e.key === "Enter" && !(multiline && e.shiftKey)) {
          e.preventDefault();
          void commit();
        }
      },
      className: cn(
        "w-full rounded border border-ring bg-card px-1.5 py-1 text-sm outline-none aria-[invalid=true]:border-destructive",
        type === "number" && "text-end ltr-nums",
        inputClassName,
      ),
    };
    return multiline ? <textarea rows={2} {...common} /> : <input inputMode={type === "number" ? "decimal" : undefined} {...common} />;
  }

  return (
    <button
      type="button"
      onClick={start}
      disabled={readOnly}
      aria-label={label}
      className={cn(
        "block min-h-7 w-full rounded px-1.5 py-1 text-start disabled:cursor-default",
        !readOnly && "hover:bg-muted focus-visible:bg-muted",
        type === "number" && "text-end num",
        className,
      )}
    >
      {display ?? (value === null || value === "" ? <span className="text-muted-foreground">—</span> : value)}
    </button>
  );
}
