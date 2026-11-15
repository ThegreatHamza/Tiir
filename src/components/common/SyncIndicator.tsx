import * as React from "react";
import { useTranslation } from "react-i18next";
import { useLiveQuery } from "dexie-react-hooks";
import { CloudOff, CloudUpload, Cloud, RotateCw, TriangleAlert, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { offlineDb } from "@/lib/offline/store";
import { discardItem, retryFailed, syncNow } from "@/lib/offline/sync";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

function useOnline() {
  const [online, setOnline] = React.useState(typeof navigator === "undefined" ? true : navigator.onLine);
  React.useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

/** Visible sync status: online/offline, entries waiting, failures, overwritten entries. */
export function SyncIndicator() {
  const { t } = useTranslation();
  const online = useOnline();
  const queue = useLiveQuery(() => offlineDb.queue.toArray(), [], []);
  const unseen = useLiveQuery(() => offlineDb.events.filter((e) => !e.seen).toArray(), [], []);
  const last = useLiveQuery(() => offlineDb.kv.get("lastSync"), [], undefined);
  const pending = queue.filter((q) => q.status === "pending");
  const failed = queue.filter((q) => q.status === "failed");
  const shown = React.useRef(new Set<string>());

  React.useEffect(() => {
    for (const e of unseen) {
      if (shown.current.has(e.id)) continue;
      shown.current.add(e.id);
      if (e.kind === "overwritten") toast.warning(t("sync.overwritten", { label: e.label }), { duration: 10000 });
      if (e.kind === "failed") toast.error(t("sync.failedOne", { label: e.label }));
    }
  }, [unseen, t]);

  const Icon = !online ? CloudOff : failed.length ? TriangleAlert : pending.length ? CloudUpload : Cloud;
  const label = !online
    ? t("sync.offline")
    : failed.length
      ? t("sync.failed", { count: failed.length })
      : pending.length
        ? t("sync.pending", { count: pending.length })
        : t("sync.upToDate");

  return (
    <DropdownMenu
      onOpenChange={(o) => {
        if (!o) void offlineDb.events.filter((e) => !e.seen).modify({ seen: true });
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn("gap-1.5 px-2", !online && "text-warning", failed.length > 0 && "text-destructive")}
          aria-label={label}
          title={label}
        >
          <Icon />
          {pending.length + failed.length > 0 ? <span className="text-xs font-semibold num">{pending.length + failed.length}</span> : null}
          <span className="sr-only">{label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>{label}</span>
          {online && (pending.length || failed.length) ? (
            <Button variant="link" size="sm" onClick={() => void (failed.length ? retryFailed() : syncNow())}>
              <RotateCw /> {t("sync.retry")}
            </Button>
          ) : null}
        </DropdownMenuLabel>
        <p className="px-2 pb-1 text-xs text-muted-foreground">
          {last?.value ? t("sync.lastSync", { at: formatDateTime(last.value) }) : t("sync.neverSynced")}
        </p>
        {queue.length ? <DropdownMenuSeparator /> : null}
        <ul className="max-h-64 overflow-y-auto">
          {queue.map((q) => (
            <li key={q.id} className="flex items-start gap-2 px-2 py-1.5 text-sm">
              {q.status === "failed" ? (
                <TriangleAlert className="mt-0.5 size-4 text-destructive" />
              ) : (
                <CloudUpload className="mt-0.5 size-4 text-muted-foreground" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate">{q.label}</p>
                {q.error ? <p className="truncate text-xs text-destructive">{q.error}</p> : null}
              </div>
              {q.status === "failed" ? (
                <button
                  type="button"
                  className="rounded p-1 hover:bg-muted"
                  onClick={() => void discardItem(q.id)}
                  aria-label={t("sync.discard")}
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
        {unseen.filter((e) => e.kind === "overwritten").length ? (
          <>
            <DropdownMenuSeparator />
            {unseen
              .filter((e) => e.kind === "overwritten")
              .map((e) => (
                <p key={e.id} className="px-2 py-1 text-xs text-warning">
                  {t("sync.overwritten", { label: e.label })}
                </p>
              ))}
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
