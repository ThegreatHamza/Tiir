import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/lib/supabase";
import { qk } from "@/lib/queryKeys";
import { formatDateTime } from "@/lib/format";
import { useUser } from "@/features/auth/AuthProvider";
import { useCurrentCompany } from "@/features/companies/CompanyProvider";
import { cn } from "@/lib/utils";

type Payload = Record<string, string | number | boolean | null>;

export function NotificationsMenu() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useUser();
  const { companyId, company } = useCurrentCompany();
  const queryClient = useQueryClient();
  const key = qk.notifications(companyId, user.id);

  const query = useQuery({
    queryKey: key,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, kind, payload, link, read_at, created_at")
        .eq("company_id", companyId)
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const markAll = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("company_id", companyId)
        .eq("user_id", user.id)
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  const items = query.data ?? [];
  const unread = items.filter((n) => !n.read_at).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={t("notifications.title", { count: unread })}>
          <Bell />
          {unread > 0 ? (
            <span className="absolute end-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground num">
              {unread}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between">
          <DropdownMenuLabel>{t("notifications.heading")}</DropdownMenuLabel>
          {unread > 0 ? (
            <Button variant="link" size="sm" onClick={() => markAll.mutate()}>
              {t("notifications.markAllRead")}
            </Button>
          ) : null}
        </div>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">{t("notifications.empty")}</p>
        ) : (
          items.map((n) => (
            <DropdownMenuItem
              key={n.id}
              className={cn("flex-col items-start gap-0.5", !n.read_at && "bg-accent/10")}
              onSelect={async () => {
                if (!n.read_at) {
                  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", n.id);
                  void queryClient.invalidateQueries({ queryKey: key });
                }
                if (n.link) navigate(n.link);
              }}
            >
              <span>{t(`notifications.kinds.${n.kind}`, (n.payload ?? {}) as Payload)}</span>
              <span className="text-xs text-muted-foreground">{formatDateTime(n.created_at, company.timezone)}</span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
