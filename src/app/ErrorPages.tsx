import { Link, isRouteErrorResponse, useRouteError } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState } from "@/components/common/States";
import { Logo } from "@/components/common/Logo";

export function NotFoundPage({ standalone }: { standalone?: boolean }) {
  const { t } = useTranslation();
  const body = (
    <EmptyState
      icon={<Compass className="size-8" aria-hidden />}
      title={t("errors.pageNotFound")}
      description={t("errors.pageNotFoundHint")}
      action={
        <Button asChild variant="outline">
          <Link to="/">{t("errors.goHome")}</Link>
        </Button>
      }
    />
  );
  if (!standalone) return body;
  return (
    <div className="mx-auto grid max-w-lg gap-6 p-6">
      <Logo plate />
      {body}
    </div>
  );
}

export function RouteErrorPage() {
  const { t } = useTranslation();
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage standalone />;
  return (
    <div className="mx-auto grid max-w-lg gap-6 p-6">
      <Logo plate />
      <ErrorState message={t("errors.unexpected")} onRetry={() => window.location.reload()} />
    </div>
  );
}
