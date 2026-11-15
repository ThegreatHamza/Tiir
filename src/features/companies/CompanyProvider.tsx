import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, type Tables } from "@/lib/supabase";
import { qk } from "@/lib/queryKeys";
import type { AppRole } from "@/lib/roles";
import { useAuth } from "@/features/auth/AuthProvider";

export type Membership = {
  id: string;
  role: AppRole;
  company: Tables<"companies">;
};

type CompanyContextValue = {
  profile: Tables<"profiles"> | null;
  memberships: Membership[];
  current: Membership | null;
  company: Tables<"companies"> | null;
  role: AppRole | null;
  loading: boolean;
  error: unknown;
  refetch: () => void;
  switchCompany: (companyId: string) => Promise<void>;
};

const CompanyContext = React.createContext<CompanyContextValue | null>(null);

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";

  const profileQuery = useQuery({
    queryKey: qk.profile(userId),
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const membershipsQuery = useQuery({
    queryKey: qk.memberships(userId),
    enabled: Boolean(user),
    queryFn: async (): Promise<Membership[]> => {
      const { data, error } = await supabase
        .from("company_members")
        .select("id, role, company:companies!inner(*)")
        .eq("user_id", userId)
        .eq("status", "active")
        .is("deleted_at", null)
        .is("company.deleted_at", null)
        .order("created_at");
      if (error) throw error;
      return (data ?? []).flatMap((m) => (m.company ? [{ id: m.id, role: m.role, company: m.company }] : []));
    },
  });

  const memberships = React.useMemo(() => membershipsQuery.data ?? [], [membershipsQuery.data]);
  const profile = profileQuery.data ?? null;
  const current = React.useMemo(
    () => memberships.find((m) => m.company.id === profile?.last_company_id) ?? memberships[0] ?? null,
    [memberships, profile?.last_company_id],
  );

  const switchMutation = useMutation({
    mutationFn: async (companyId: string) => {
      const { error } = await supabase.from("profiles").update({ last_company_id: companyId }).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: ["company"] });
      await queryClient.invalidateQueries({ queryKey: qk.profile(userId) });
    },
  });

  const value = React.useMemo<CompanyContextValue>(
    () => ({
      profile,
      memberships,
      current,
      company: current?.company ?? null,
      role: current?.role ?? null,
      loading: profileQuery.isLoading || membershipsQuery.isLoading,
      error: profileQuery.error ?? membershipsQuery.error,
      refetch: () => {
        void profileQuery.refetch();
        void membershipsQuery.refetch();
      },
      switchCompany: async (companyId) => {
        await switchMutation.mutateAsync(companyId);
      },
    }),
    [profile, memberships, current, profileQuery, membershipsQuery, switchMutation],
  );

  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}

export function useCompanyContext(): CompanyContextValue {
  const ctx = React.useContext(CompanyContext);
  if (!ctx) throw new Error("useCompanyContext must be used inside <CompanyProvider>");
  return ctx;
}

/** Current company and role; use under <RequireCompany>. */
export function useCurrentCompany(): { company: Tables<"companies">; role: AppRole; companyId: string } {
  const { company, role } = useCompanyContext();
  if (!company || !role) throw new Error("useCurrentCompany requires a selected company");
  return { company, role, companyId: company.id };
}
