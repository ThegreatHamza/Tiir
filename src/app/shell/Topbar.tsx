import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, Check, ChevronsUpDown, LogOut, Moon, Plus, Sun, UserCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { Logo } from "@/components/common/Logo";
import { useAuth, useUser } from "@/features/auth/AuthProvider";
import { useCompanyContext } from "@/features/companies/CompanyProvider";
import { NotificationsMenu } from "@/features/notifications/NotificationsMenu";
import { supabase } from "@/lib/supabase";
import { qk } from "@/lib/queryKeys";
import { errorMessage } from "@/lib/errors";
import { applyTheme } from "@/lib/theme";
import type { AppLanguage } from "@/lib/format";

function CompanySwitcher() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { memberships, current, switchCompany } = useCompanyContext();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="max-w-[55vw] justify-start gap-2 px-2 sm:max-w-xs" aria-label={t("companies.switch")}>
          <Building2 className="text-muted-foreground" aria-hidden />
          <span className="truncate font-semibold">{current?.company.name}</span>
          <ChevronsUpDown className="opacity-50" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel>{t("companies.switch")}</DropdownMenuLabel>
        {memberships.map((m) => (
          <DropdownMenuItem
            key={m.company.id}
            onSelect={async () => {
              if (m.company.id === current?.company.id) return;
              try {
                await switchCompany(m.company.id);
                navigate("/projects");
              } catch (e) {
                toast.error(errorMessage(t, e));
              }
            }}
          >
            <span className="flex size-4 items-center">{m.company.id === current?.company.id ? <Check /> : null}</span>
            <span className="flex-1 truncate">{m.company.name}</span>
            <Badge variant="secondary">{t(`roles.${m.role}`)}</Badge>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate("/onboarding")}>
          <Plus /> {t("companies.joinOrCreate")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Topbar({ menuButton }: { menuButton: React.ReactNode }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useUser();
  const { signOut } = useAuth();
  const { profile } = useCompanyContext();
  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  const [, force] = React.useReducer((x: number) => x + 1, 0);

  async function savePreference(patch: { language?: AppLanguage; theme?: "light" | "dark" }) {
    const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
    if (error) toast.error(errorMessage(t, error));
    else await queryClient.invalidateQueries({ queryKey: qk.profile(user.id) });
  }

  const name = profile?.full_name || user.email || "";
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-1 border-b bg-card/95 px-2 backdrop-blur sm:px-3">
      {menuButton}
      <Logo variant="mark" className="me-1 lg:hidden" />
      <CompanySwitcher />
      <div className="ms-auto flex items-center gap-0.5">
        <LanguageSwitcher compact onChange={(language) => void savePreference({ language })} />
        <Button
          variant="ghost"
          size="icon"
          aria-label={t("account.toggleTheme")}
          onClick={() => {
            const next = isDark ? "light" : "dark";
            applyTheme(next);
            force();
            void savePreference({ theme: next });
          }}
        >
          {isDark ? <Sun /> : <Moon />}
        </Button>
        <NotificationsMenu />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={t("nav.account")}>
              <Avatar name={name} className="size-7" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="font-normal">
              <p className="truncate font-medium text-foreground">{profile?.full_name}</p>
              <p className="truncate">{user.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => navigate("/account")}>
              <UserCircle /> {t("nav.account")}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void signOut()}>
              <LogOut /> {t("auth.signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
