import type { TFunction } from "i18next";

type PgLikeError = { code?: string; message?: string; status?: number } | null | undefined;

/** Maps Supabase / Postgres errors to translated, user-facing messages. */
export function errorMessage(t: TFunction, error: unknown): string {
  const e = error as PgLikeError;
  const msg = e?.message ?? "";
  if (/Failed to fetch|NetworkError|network/i.test(msg)) return t("errors.network");
  if (/Invalid login credentials/i.test(msg)) return t("auth.invalidCredentials");
  if (/Email not confirmed/i.test(msg)) return t("auth.emailNotConfirmed");
  if (/User already registered/i.test(msg)) return t("auth.alreadyRegistered");
  if (/already a member/i.test(msg)) return t("members.alreadyMember");
  if (/at least one owner/i.test(msg)) return t("members.lastOwner");
  if (/own membership/i.test(msg)) return t("members.cannotEditSelf");
  if (/only an owner/i.test(msg)) return t("members.onlyOwner");
  if (/currency cannot be changed/i.test(msg)) return t("projects.currencyLocked");
  if (/projects_code_unique_live/i.test(msg)) return t("projects.duplicateCode");
  switch (e?.code) {
    case "42501":
      return t("errors.forbidden");
    case "23505":
      return t("errors.duplicate");
    case "23514":
      return t("errors.invalid");
    case "PGRST116":
      return t("errors.notFound");
    default:
      return t("errors.generic");
  }
}
