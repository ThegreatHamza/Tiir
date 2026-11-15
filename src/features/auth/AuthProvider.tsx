import * as React from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  /** True after the user opened a password-reset link. */
  recovery: boolean;
  clearRecovery: () => void;
  signOut: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [session, setSession] = React.useState<Session | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [recovery, setRecovery] = React.useState(false);
  const manualSignOut = React.useRef(false);
  const hadSession = React.useRef(false);

  React.useEffect(() => {
    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      hadSession.current = Boolean(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      if (event === "SIGNED_OUT") {
        // A sign-out we did not ask for means the session expired or was revoked.
        if (hadSession.current && !manualSignOut.current) toast.warning(t("auth.sessionExpired"));
        manualSignOut.current = false;
        queryClient.clear();
      }
      hadSession.current = Boolean(next);
      setSession(next);
      setLoading(false);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [queryClient, t]);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      recovery,
      clearRecovery: () => setRecovery(false),
      signOut: async () => {
        manualSignOut.current = true;
        await supabase.auth.signOut();
      },
    }),
    [session, loading, recovery],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** Same as useAuth but asserts a signed-in user (use under <RequireAuth>). */
export function useUser(): User {
  const { user } = useAuth();
  if (!user) throw new Error("useUser requires a signed-in user");
  return user;
}
