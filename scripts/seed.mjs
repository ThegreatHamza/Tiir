#!/usr/bin/env node
// Tiir demo seed — one demo company, two demo projects, one user per role.
//
//   npm run seed
//
// Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from the environment
// (or .env). The service role key is used ONLY here, on your machine, never
// in the frontend. Re-running is safe: existing demo users are reused.
//
// Every demo user has the password printed at the end.
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see .env.example).");
  process.exit(1);
}

const PASSWORD = process.env.SEED_PASSWORD || "Tiir-demo-2026";
const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

const must =
  (label) =>
  ({ data, error }) => {
    if (error) throw new Error(`${label}: ${error.message}`);
    return data;
  };

const USERS = [
  { key: "owner", email: "owner@demo.tiir.dj", name: "Ahmed Hassan", role: "owner", language: "fr" },
  { key: "pm", email: "pm@demo.tiir.dj", name: "Fatouma Ali", role: "project_manager", language: "fr" },
  { key: "estimator", email: "metreur@demo.tiir.dj", name: "Omar Youssouf", role: "estimator", language: "fr" },
  { key: "foreman", email: "chantier@demo.tiir.dj", name: "Abdi Warsame", role: "site_foreman", language: "so" },
  { key: "store", email: "magasin@demo.tiir.dj", name: "Hodan Robleh", role: "storekeeper", language: "so" },
  { key: "accountant", email: "compta@demo.tiir.dj", name: "Mariam Said", role: "accountant", language: "ar" },
  { key: "client", email: "client@demo.tiir.dj", name: "Ministère de l'Éducation (démo)", role: "client_viewer", language: "fr" },
];

async function findUserByEmail(email) {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email);
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function ensureUser(u, metadata) {
  const existing = await findUserByEmail(u.email);
  if (existing) return existing.id;
  const { data, error } = await db.auth.admin.createUser({
    email: u.email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: u.name, language: u.language, ...metadata },
  });
  if (error) throw new Error(`create ${u.email}: ${error.message}`);
  return data.user.id;
}

async function main() {
  console.log("→ users");
  const ids = {};
  // The owner signs up with a company name: the database trigger creates the company.
  ids.owner = await ensureUser(USERS[0], { company_name: "Tiir Démo BTP", country: "DJ", currency: "DJF" });
  for (const u of USERS.slice(1)) ids[u.key] = await ensureUser(u, {});

  const company = await db
    .from("company_members")
    .select("company_id, companies!inner(name)")
    .eq("user_id", ids.owner)
    .eq("role", "owner")
    .is("deleted_at", null)
    .limit(1)
    .single()
    .then(must("find demo company"));
  const companyId = company.company_id;
  console.log(`→ company ${companyId}`);

  await db
    .from("companies")
    .update({
      legal_name: "Tiir Démo BTP SARL",
      city: "Djibouti",
      address: "Avenue 26, Plateau du Serpent",
      phone: "+253 21 00 00 00",
      tax_id: "DJ-000000",
    })
    .eq("id", companyId)
    .then(must("company details"));

  // Demo rates (settings, not constants): VAT 10 %, retention 5 %, coefficient 1.25.
  await db
    .from("company_settings")
    .update({
      vat_rate: 10,
      retention_rate: 5,
      advance_recovery_rate: 10,
      price_coefficient: 1.25,
      overtime_multiplier: 1.5,
      working_hours_per_day: 8,
    })
    .eq("company_id", companyId)
    .then(must("company settings"));

  console.log("→ members");
  for (const u of USERS.slice(1)) {
    const exists = await db
      .from("company_members")
      .select("id")
      .eq("company_id", companyId)
      .eq("user_id", ids[u.key])
      .is("deleted_at", null)
      .maybeSingle()
      .then(must("member lookup"));
    if (!exists) {
      await db
        .from("company_members")
        .insert({ company_id: companyId, user_id: ids[u.key], role: u.role, created_by: ids.owner })
        .then(must(`member ${u.email}`));
    }
    await db.from("profiles").update({ last_company_id: companyId }).eq("id", ids[u.key]).then(must("profile"));
  }

  console.log("→ clients");
  const clientRows = [
    { name: "Ministère de l'Éducation nationale", contact_name: "Direction des constructions scolaires", phone: "+253 21 35 00 00" },
    { name: "Dire Dawa Logistics PLC", contact_name: "Procurement office", phone: "+251 25 111 0000" },
  ];
  const clients = {};
  for (const c of clientRows) {
    const found = await db
      .from("clients")
      .select("id")
      .eq("company_id", companyId)
      .eq("name", c.name)
      .maybeSingle()
      .then(must("client lookup"));
    clients[c.name] =
      found?.id ??
      (
        await db
          .from("clients")
          .insert({ company_id: companyId, name: c.name, contact_name: c.contact_name, phone: c.phone, created_by: ids.owner })
          .select("id")
          .single()
          .then(must(`client ${c.name}`))
      ).id;
  }

  console.log("→ projects");
  const projectRows = [
    {
      code: "DJ-2026-001",
      name: "École primaire de Balbala — 12 classes",
      client_id: clients["Ministère de l'Éducation nationale"],
      currency: "DJF",
      country: "DJ",
      city: "Djibouti",
      site_address: "Balbala, secteur 4",
      status: "active",
      start_date: "2026-02-01",
      end_date: "2026-12-15",
      description: "Construction d'un groupe scolaire R+1 en béton armé, avec bloc sanitaire et clôture.",
    },
    {
      code: "ET-2026-002",
      name: "Dire Dawa warehouse — 2,400 m²",
      client_id: clients["Dire Dawa Logistics PLC"],
      currency: "ETB",
      country: "ET",
      city: "Dire Dawa",
      site_address: "Industrial zone, plot 17",
      status: "tender",
      start_date: "2026-04-01",
      end_date: "2027-01-31",
      description: "Steel-frame warehouse with reinforced concrete slab and office annex.",
    },
  ];
  const projects = [];
  for (const p of projectRows) {
    const found = await db
      .from("projects")
      .select("id")
      .eq("company_id", companyId)
      .eq("code", p.code)
      .maybeSingle()
      .then(must("project lookup"));
    const id =
      found?.id ??
      (
        await db
          .from("projects")
          .insert({ company_id: companyId, created_by: ids.owner, ...p })
          .select("id")
          .single()
          .then(must(`project ${p.code}`))
      ).id;
    projects.push(id);
  }

  // Assignments: PM, estimator and accountant on both; foreman, storekeeper and client on the school.
  const assign = [
    ["pm", projects],
    ["estimator", projects],
    ["accountant", projects],
    ["foreman", [projects[0]]],
    ["store", [projects[0]]],
    ["client", [projects[0]]],
  ];
  for (const [key, list] of assign) {
    for (const projectId of list) {
      const found = await db
        .from("project_members")
        .select("id")
        .eq("project_id", projectId)
        .eq("user_id", ids[key])
        .is("deleted_at", null)
        .maybeSingle()
        .then(must("assignment lookup"));
      if (!found) {
        await db
          .from("project_members")
          .insert({ company_id: companyId, project_id: projectId, user_id: ids[key], created_by: ids.owner })
          .then(must(`assign ${key}`));
      }
    }
  }

  console.log("\n✓ Demo data ready. Sign in with any of these (password: %s):", PASSWORD);
  for (const u of USERS) console.log(`  ${u.role.padEnd(16)} ${u.email}`);
}

main().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});
