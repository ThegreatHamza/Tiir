import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Native <select>: best behaviour on Android phones (system picker),
 * accessible, works in RTL, and dense on desktop.
 */
export const NativeSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          "flex h-9 w-full appearance-none rounded-md border border-input bg-card pe-8 ps-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute end-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
    </div>
  ),
);
NativeSelect.displayName = "NativeSelect";
