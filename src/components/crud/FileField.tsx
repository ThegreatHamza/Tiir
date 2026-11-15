import * as React from "react";
import { useTranslation } from "react-i18next";
import { ExternalLink, Loader2, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { signedUrl, storagePath, STORAGE_BUCKET, supabase } from "@/lib/supabase";
import { compressImage } from "@/lib/images";
import { errorMessage } from "@/lib/errors";

const MAX_BYTES = 25 * 1024 * 1024;

/** Uploads to private storage (company/project/module/file) and returns the path. */
export function FileField({
  value,
  onChange,
  companyId,
  projectId,
  module,
  accept,
  disabled,
  id,
  compress = true,
}: {
  value: string;
  onChange: (path: string) => void;
  companyId: string;
  projectId?: string;
  module: string;
  accept?: string;
  disabled?: boolean;
  id?: string;
  compress?: boolean;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = React.useState(false);
  const input = React.useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    if (file.size > MAX_BYTES) return toast.error(t("files.tooLarge"));
    setBusy(true);
    try {
      const body = compress && file.type.startsWith("image/") ? await compressImage(file) : file;
      const path = storagePath(companyId, projectId ?? null, module, file.name);
      const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, body, { contentType: body.type || file.type, upsert: false });
      if (error) throw error;
      onChange(path);
    } catch (e) {
      toast.error(errorMessage(t, e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={input}
        id={id}
        type="file"
        accept={accept}
        className="sr-only"
        disabled={disabled}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void upload(f);
          e.target.value = "";
        }}
      />
      <Button type="button" variant="outline" size="sm" onClick={() => input.current?.click()} disabled={disabled || busy}>
        {busy ? <Loader2 className="animate-spin" /> : <Paperclip />} {value ? t("files.replace") : t("files.attach")}
      </Button>
      {value ? (
        <>
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={async () => {
              const url = await signedUrl(value);
              if (url) window.open(url, "_blank", "noopener");
            }}
          >
            <ExternalLink /> {value.split("/").pop()?.replace(/^\d+-/, "")}
          </Button>
          {!disabled ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              onClick={() => onChange("")}
              aria-label={t("common.remove")}
            >
              <X />
            </Button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
