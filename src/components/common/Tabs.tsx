import { cn } from "@/lib/utils";

/** Simple accessible tab bar (state lives in the parent). */
export function TabBar<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: readonly { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label?: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex w-full max-w-full overflow-x-auto rounded-md border p-0.5 sm:w-fit">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          role="tab"
          type="button"
          aria-selected={value === tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            "min-h-9 shrink-0 rounded px-3 text-sm",
            value === tab.value ? "bg-primary text-primary-foreground" : "hover:bg-muted",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
