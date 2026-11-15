import logo from "@/assets/tiir-logo.png";
import mark from "@/assets/tiir-mark.png";
import { cn } from "@/lib/utils";

/**
 * The Tiir logo, used unchanged (never redrawn or recoloured).
 * `plate` sets it on a white plate so the navy wordmark stays legible on
 * dark backgrounds (sidebar, dark theme).
 */
export function Logo({ className, variant = "full", plate = false }: { className?: string; variant?: "full" | "mark"; plate?: boolean }) {
  const img = (
    <img
      src={variant === "full" ? logo : mark}
      alt="Tiir"
      className={cn("select-none", variant === "full" ? "h-8 w-auto" : "size-8", !plate && className)}
      draggable={false}
    />
  );
  if (!plate) return img;
  return <span className={cn("inline-flex items-center rounded-md bg-white px-2 py-1", className)}>{img}</span>;
}
