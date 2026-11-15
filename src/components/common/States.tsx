import * as React from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Inbox, Loader2, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string | undefined;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-card px-6 py-12 text-center">
      <div className="text-muted-foreground">{icon ?? <Inbox className="size-8" aria-hidden />}</div>
      <p className="font-medium">{title}</p>
      {description ? <p className="max-w-md text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useTranslation();
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-10 text-center"
    >
      <AlertTriangle className="size-8 text-destructive" aria-hidden />
      <p className="font-medium">{message}</p>
      {onRetry ? (
        <Button variant="outline" onClick={onRetry}>
          <RotateCw /> {t("common.retry")}
        </Button>
      ) : null}
    </div>
  );
}

export function LoadingScreen() {
  const { t } = useTranslation();
  return (
    <div className="flex h-full min-h-[50vh] items-center justify-center" role="status">
      <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
      <span className="sr-only">{t("common.loading")}</span>
    </div>
  );
}
