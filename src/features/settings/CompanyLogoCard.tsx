import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { ImageUp, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentCompany } from "@/features/companies/CompanyProvider";
import { useUser } from "@/features/auth/AuthProvider";
import { signedUrl, storagePath, STORAGE_BUCKET, supabase } from "@/lib/supabase";
import { qk } from "@/lib/queryKeys";
import { errorMessage } from "@/lib/errors";
import { updateCompany } from "./api";

const MAX_BYTES = 2 * 1024 * 1024;
const TYPES = ["image/png", "image/jpeg", "image/webp"];

/** The company's own logo, printed in its PDF headers next to the Tiir logo. */
export function CompanyLogoCard() {
  const { t } = useTranslation();
  const user = useUser();
  const queryClient = useQueryClient();
  const { company, companyId } = useCurrentCompany();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const url = useQuery({
    queryKey: ["company", companyId, "logo-url", company.logo_path],
    queryFn: () => (company.logo_path ? signedUrl(company.logo_path) : Promise.resolve(null)),
    staleTime: 30 * 60 * 1000,
  });

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: qk.memberships(user.id) });
  }

  async function upload(file: File) {
    if (!TYPES.includes(file.type)) return toast.error(t("settings.logoType"));
    if (file.size > MAX_BYTES) return toast.error(t("settings.logoSize"));
    setBusy(true);
    try {
      const path = storagePath(companyId, null, "branding", file.name);
      const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      const old = company.logo_path;
      await updateCompany(companyId, { logo_path: path });
      if (old) await supabase.storage.from(STORAGE_BUCKET).remove([old]);
      toast.success(t("common.saved"));
      await refresh();
    } catch (e) {
      toast.error(errorMessage(t, e));
    } finally {
      setBusy(false);
    }
  }

  async function removeLogo() {
    if (!company.logo_path) return;
    setBusy(true);
    try {
      await updateCompany(companyId, { logo_path: null });
      await supabase.storage.from(STORAGE_BUCKET).remove([company.logo_path]);
      await refresh();
    } catch (e) {
      toast.error(errorMessage(t, e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.companyLogo")}</CardTitle>
        <CardDescription>{t("settings.companyLogoHint")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-4">
        <div className="flex h-20 w-40 items-center justify-center rounded-md border bg-white p-2">
          {url.data ? (
            <img src={url.data} alt={company.name} className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-xs text-muted-foreground">{t("settings.noLogo")}</span>
          )}
        </div>
        <input
          ref={input}
          type="file"
          accept={TYPES.join(",")}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
            e.target.value = "";
          }}
        />
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => input.current?.click()} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <ImageUp />} {t("settings.uploadLogo")}
          </Button>
          {company.logo_path ? (
            <Button variant="ghost" onClick={() => void removeLogo()} disabled={busy} aria-label={t("common.remove")}>
              <Trash2 />
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
