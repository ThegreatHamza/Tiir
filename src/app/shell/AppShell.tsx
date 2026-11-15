import * as React from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/common/Logo";
import { Button } from "@/components/ui/button";
import { useCurrentCompany } from "@/features/companies/CompanyProvider";
import { visibleNav } from "./nav";
import { Topbar } from "./Topbar";

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation();
  const { role } = useCurrentCompany();
  return (
    <nav aria-label={t("nav.main")} className="flex flex-col gap-5">
      {visibleNav(role).map((section) => (
        <div key={section.labelKey}>
          <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/60">{t(section.labelKey)}</p>
          <ul className="grid gap-0.5">
            {section.items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      "flex min-h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-white/10",
                      isActive &&
                        "bg-white/10 text-white shadow-[inset_3px_0_0_hsl(var(--sidebar-active))] rtl:shadow-[inset_-3px_0_0_hsl(var(--sidebar-active))]",
                    )
                  }
                >
                  <item.icon className="size-4 shrink-0" aria-hidden />
                  {t(item.labelKey)}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function AppShell() {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);
  const location = useLocation();

  React.useEffect(() => setOpen(false), [location.pathname]);

  return (
    <div className="flex min-h-full">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:start-2 focus:top-2 focus:z-50 focus:rounded focus:bg-card focus:p-2"
      >
        {t("common.skipToContent")}
      </a>
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 bg-sidebar p-3 lg:flex">
        <div className="px-1 pt-1">
          <Logo plate />
        </div>
        <SidebarNav />
      </aside>

      {/* Mobile drawer */}
      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/50 lg:hidden" />
          <DialogPrimitive.Content className="fixed inset-y-0 start-0 z-50 flex w-72 flex-col gap-6 bg-sidebar p-3 shadow-xl lg:hidden">
            <DialogPrimitive.Title className="sr-only">{t("nav.main")}</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">{t("nav.main")}</DialogPrimitive.Description>
            <div className="flex items-center justify-between px-1 pt-1">
              <Logo plate />
              <DialogPrimitive.Close asChild>
                <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-white/10" aria-label={t("common.close")}>
                  <X />
                </Button>
              </DialogPrimitive.Close>
            </div>
            <SidebarNav onNavigate={() => setOpen(false)} />
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          menuButton={
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpen(true)} aria-label={t("nav.openMenu")}>
              <Menu />
            </Button>
          }
        />
        <main id="main" className="mx-auto w-full max-w-7xl flex-1 p-3 sm:p-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
