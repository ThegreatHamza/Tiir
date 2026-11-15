import { Toaster as Sonner } from "sonner";

export function Toaster({ dir, theme }: { dir: "ltr" | "rtl"; theme: "light" | "dark" }) {
  return <Sonner dir={dir} theme={theme} position={dir === "rtl" ? "top-left" : "top-right"} richColors closeButton />;
}
