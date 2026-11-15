// Tiir · Edge Function · invite-member
//
// Why an Edge Function: sending an invitation email needs the Supabase
// admin API (service role), which must never reach the browser.
//
// Flow:
//   1. The caller's JWT is used to call public.create_invitation(), so all
//      permission checks (owner/admin, owner-only roles, company scope)
//      happen in Postgres under the caller's identity.
//   2. Only then is the service-role client used, to email new users an
//      invitation link. Existing users see the invitation in the app.
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ROLES = ["owner", "admin", "project_manager", "estimator", "site_foreman", "storekeeper", "accountant", "client_viewer"] as const;

type Body = {
  company_id: string;
  email: string;
  role: (typeof ROLES)[number];
  project_ids?: string[];
  redirect_to?: string;
  language?: string;
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json(401, { error: "not_authenticated" });

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return json(400, { error: "invalid_body" });
  }
  if (!body.company_id || !body.email || !ROLES.includes(body.role)) {
    return json(400, { error: "invalid_body" });
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const asCaller = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data: invitationId, error: rpcError } = await asCaller.rpc("create_invitation", {
    p_company_id: body.company_id,
    p_email: body.email,
    p_role: body.role,
    p_project_ids: body.project_ids ?? [],
  });
  if (rpcError) {
    const status = rpcError.code === "42501" ? 403 : rpcError.code === "23505" ? 409 : 400;
    return json(status, { error: rpcError.message, code: rpcError.code });
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(body.email.trim().toLowerCase(), {
    redirectTo: body.redirect_to,
    data: { language: body.language, invited: true },
  });

  if (inviteError) {
    // The address already has an account: they will find the invitation in the app.
    const exists = /already|registered|exists/i.test(inviteError.message);
    if (exists) return json(200, { invitation_id: invitationId, delivery: "in_app" });
    return json(200, { invitation_id: invitationId, delivery: "failed", error: inviteError.message });
  }
  return json(200, { invitation_id: invitationId, delivery: "email" });
});
