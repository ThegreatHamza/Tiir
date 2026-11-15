import * as React from "react";
import { Logo } from "@/components/common/Logo";
import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AuthLayout({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col bg-muted/40">
      <header className="flex justify-end p-3">
        <LanguageSwitcher />
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-4 pb-12">
        <Logo plate className="mb-6 [&_img]:h-12" />
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-xl">{title}</CardTitle>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
        {footer ? <div className="mt-4 text-sm text-muted-foreground">{footer}</div> : null}
      </main>
    </div>
  );
}
