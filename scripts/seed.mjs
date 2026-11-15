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

  // -------------------------------------------------------------------------
  // Phase 1 — price library and a first estimate for each project
  // -------------------------------------------------------------------------
  console.log("→ price library");
  const resources = [
    ["CIM-425", "Ciment CPJ 42.5 (sac 50 kg)", "material", "t", 26000, "DJF"],
    ["SAB-05", "Sable 0/5", "material", "m3", 4000, "DJF"],
    ["GRA-1525", "Gravier 15/25", "material", "m3", 5500, "DJF"],
    ["HA-12", "Acier HA Fe E400", "material", "kg", 230, "DJF"],
    ["AGG-15", "Agglos creux 15×20×40", "material", "u", 120, "DJF"],
    ["EAU", "Eau de gâchage", "material", "m3", 600, "DJF"],
    ["MO-CHEF", "Chef d'équipe", "labour", "h", 900, "DJF"],
    ["MO-MAC", "Maçon", "labour", "h", 600, "DJF"],
    ["MO-MAN", "Manœuvre", "labour", "h", 350, "DJF"],
    ["BET-350", "Bétonnière 350 L", "equipment", "day", 9000, "DJF"],
    ["PEL-MEC", "Pelle mécanique avec conducteur", "equipment", "h", 18000, "DJF"],
    ["ST-ETAN", "Étanchéité toiture (sous-traitance)", "subcontract", "m2", 6500, "DJF"],
    ["CEM-ET", "Cement OPC 42.5", "material", "t", 9800, "ETB"],
    ["MO-DL", "Daily labourer", "labour", "day", 450, "ETB"],
  ];
  // Inserted directly: the import RPC checks the caller's role, and the service role has no caller.
  for (const [code, name, kind, unit, unit_cost, currency] of resources) {
    const found = await db
      .from("price_resources")
      .select("id")
      .eq("company_id", companyId)
      .eq("code", code)
      .is("deleted_at", null)
      .maybeSingle()
      .then(must("resource lookup"));
    if (!found)
      await db
        .from("price_resources")
        .insert({ company_id: companyId, code, name, kind, unit, unit_cost, currency, created_by: ids.owner })
        .then(must(`resource ${code}`));
  }
  const res = Object.fromEntries(
    (
      await db
        .from("price_resources")
        .select("id, code, kind, name, unit, unit_cost")
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .then(must("resources"))
    ).map((r) => [r.code, r]),
  );

  console.log("→ estimate (school project)");
  const projectId = projects[0];
  let version = await db
    .from("boq_versions")
    .select("id")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle()
    .then(must("version lookup"));
  if (!version) {
    const scope = { company_id: companyId, project_id: projectId, created_by: ids.owner };
    version = await db
      .from("boq_versions")
      .insert({ ...scope, number: 1, name: "Offre initiale", coefficient: 1.25, is_current: true })
      .select("id")
      .single()
      .then(must("version"));
    const v = { ...scope, version_id: version.id };

    const upa = await db
      .from("unit_price_analyses")
      .insert({ ...v, code: "BA350", title: "Béton armé dosé à 350 kg/m³", unit: "m3" })
      .select("id")
      .single()
      .then(must("upa"));
    const comps = [
      ["CIM-425", 0.35, 0],
      ["SAB-05", 0.4, 5],
      ["GRA-1525", 0.8, 5],
      ["HA-12", 80, 3],
      ["EAU", 0.2, 0],
      ["MO-CHEF", 1, 0],
      ["MO-MAC", 6, 0],
      ["MO-MAN", 10, 0],
      ["BET-350", 0.15, 0],
    ];
    await db
      .from("unit_price_components")
      .insert(
        comps.map(([code, quantity, waste_rate], i) => {
          const r = res[code];
          return {
            ...v,
            upa_id: upa.id,
            resource_id: r.id,
            kind: r.kind,
            designation: r.name,
            unit: r.unit,
            quantity,
            unit_cost: r.unit_cost,
            waste_rate,
            position: i + 1,
          };
        }),
      )
      .then(must("components"));

    const s1 = await db
      .from("boq_sections")
      .insert({ ...v, code: "1", title: "Terrassements", position: 1 })
      .select("id")
      .single()
      .then(must("section 1"));
    const s2 = await db
      .from("boq_sections")
      .insert({ ...v, code: "2", title: "Gros œuvre", position: 2 })
      .select("id")
      .single()
      .then(must("section 2"));
    const s3 = await db
      .from("boq_sections")
      .insert({ ...v, code: "3", title: "Étanchéité", position: 3 })
      .select("id")
      .single()
      .then(must("section 3"));

    const item = (section_id, position, code, description, unit, extra) =>
      db
        .from("boq_items")
        .insert({ ...v, section_id, position, code, description, unit, ...extra })
        .select("id")
        .single()
        .then(must(`item ${code}`));
    await item(s1.id, 1, "1.1", "Décapage de la terre végétale sur 20 cm", "m2", { quantity: 1250, unit_cost: 450 });
    const fouilles = await item(s1.id, 2, "1.2", "Fouilles en rigole pour semelles filantes", "m3", {
      quantity_source: "takeoff",
      unit_cost: 2800,
    });
    const semelles = await item(s2.id, 1, "2.1", "Béton armé pour semelles isolées", "m3", { quantity_source: "takeoff", upa_id: upa.id });
    await item(s2.id, 2, "2.2", "Maçonnerie d'agglos creux de 15", "m2", { quantity: 860, unit_cost: 4200 });
    await item(s3.id, 1, "3.1", "Étanchéité multicouche de toiture-terrasse", "m2", { quantity: 640, unit_cost: 6500 });
    await item(s3.id, 2, "3.2", "Installation et repli de chantier", "ff", { quantity: 1, unit_price: 1500000 });

    await db
      .from("takeoff_lines")
      .insert([
        { ...v, item_id: fouilles.id, position: 1, label: "Axes A–D", count: 2, length: 42.5, width: 0.6, height: 0.8 },
        { ...v, item_id: fouilles.id, position: 2, label: "Axes 1–6", count: 2, length: 28, width: 0.6, height: 0.8 },
        {
          ...v,
          item_id: semelles.id,
          position: 1,
          label: "Semelles S1 (1,20 × 1,20 × 0,40)",
          count: 12,
          length: 1.2,
          width: 1.2,
          height: 0.4,
        },
        {
          ...v,
          item_id: semelles.id,
          position: 2,
          label: "Semelles S2 (1,50 × 1,50 × 0,45)",
          count: 6,
          length: 1.5,
          width: 1.5,
          height: 0.45,
        },
        {
          ...v,
          item_id: semelles.id,
          position: 3,
          label: "Réservation regard (à déduire)",
          count: -1,
          length: 0.6,
          width: 0.6,
          height: 0.4,
        },
      ])
      .then(must("takeoff"));
  }

  // -------------------------------------------------------------------------
  // Phases 2–9 — schedule, site diary, costs, billing, procurement, stock,
  // labour, equipment, documents and quality (school project, once).
  // -------------------------------------------------------------------------
  const already = await db
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .then((r) => r.count ?? 0);
  if (!already) await seedOperations({ companyId, projectId, ids });

  console.log("\n✓ Demo data ready. Sign in with any of these (password: %s):", PASSWORD);
  for (const u of USERS) console.log(`  ${u.role.padEnd(16)} ${u.email}`);
}

const iso = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => iso(new Date(Date.now() - n * 86_400_000));

async function seedOperations({ companyId, projectId, ids }) {
  const by = { company_id: companyId, created_by: ids.owner };
  const pj = { ...by, project_id: projectId };
  // defaultToNull: false — rows with different keys get column defaults, not NULL.
  const insert = (table, rows) =>
    db.from(table).insert(rows, { defaultToNull: false }).select().then(must(table));

  const items = await db
    .from("boq_items")
    .select("id, code, description, quantity, unit, boq_versions!inner(is_current)")
    .eq("project_id", projectId)
    .eq("boq_versions.is_current", true)
    .is("deleted_at", null)
    .order("position")
    .then(must("current items"));

  console.log("→ planning");
  const t = await insert("tasks", [
    { ...pj, name: "Installation de chantier", start_date: daysAgo(40), end_date: daysAgo(36), duration: 5, position: 1 },
    { ...pj, name: "Fondations", start_date: daysAgo(35), end_date: daysAgo(20), duration: 14, position: 2 },
    { ...pj, name: "Élévation des murs", start_date: daysAgo(19), end_date: daysAgo(-10), duration: 25, position: 3 },
    { ...pj, name: "Réception provisoire", start_date: daysAgo(-30), end_date: daysAgo(-30), duration: 0, position: 4 },
  ]);
  await insert("task_dependencies", [
    { ...pj, predecessor_id: t[0].id, successor_id: t[1].id, type: "FS" },
    { ...pj, predecessor_id: t[1].id, successor_id: t[2].id, type: "FS" },
    { ...pj, predecessor_id: t[2].id, successor_id: t[3].id, type: "FS", lag_days: 15 },
  ]);
  if (items[0]) await insert("task_boq_links", [{ ...pj, task_id: t[1].id, boq_item_id: items[0].id }]);
  if (items[1]) await insert("task_boq_links", [{ ...pj, task_id: t[2].id, boq_item_id: items[1].id }]);

  console.log("→ site diary");
  const weather = ["sunny", "heat", "windy", "sunny", "sandstorm"];
  for (let d = 5; d >= 1; d--) {
    const [r] = await insert("daily_reports", [
      {
        ...pj,
        created_by: ids.foreman,
        report_date: daysAgo(d),
        weather: weather[d - 1],
        temperature_c: 34 + d,
        status: "submitted",
        summary: "Travaux de gros œuvre selon planning.",
      },
    ]);
    await insert("daily_report_labour", [
      { ...pj, created_by: ids.foreman, daily_report_id: r.id, trade: "mason", headcount: 6, hours: 8 },
      { ...pj, created_by: ids.foreman, daily_report_id: r.id, trade: "labourer", headcount: 10, hours: 8 },
    ]);
    for (const it of items.slice(0, 2)) {
      await insert("progress_entries", [
        {
          ...pj,
          created_by: ids.foreman,
          daily_report_id: r.id,
          boq_item_id: it.id,
          entry_date: daysAgo(d),
          quantity: Math.max(0.5, Math.round((Number(it.quantity) / 12) * 10) / 10),
        },
      ]);
    }
  }
  await insert("site_issues", [
    {
      ...pj,
      created_by: ids.foreman,
      title: "Fissure sur longrine axe B",
      priority: "high",
      status: "open",
      due_date: daysAgo(2),
      location: "Bloc A",
    },
    {
      ...pj,
      created_by: ids.foreman,
      title: "Clôture provisoire à reprendre",
      priority: "low",
      status: "in_progress",
      due_date: daysAgo(-5),
    },
  ]);

  console.log("→ suppliers, procurement and stock");
  const sup = await insert("suppliers", [
    { ...by, name: "Comptoir du Ciment de Djibouti", kind: "supplier", phone: "+253 21 35 00 00" },
    { ...by, name: "Ferraillage Ali Sabieh", kind: "supplier" },
    { ...by, name: "Étanchéité Corne SARL", kind: "subcontractor" },
  ]);
  const [loc] = await insert("stock_locations", [{ ...pj, name: "Magasin principal" }]);
  const [pr] = await insert("purchase_requests", [
    { ...pj, created_by: ids.foreman, title: "Ciment et acier semaine prochaine", needed_by: daysAgo(-3), status: "approved" },
  ]);
  await insert("purchase_request_lines", [
    { ...pj, purchase_request_id: pr.id, description: "Ciment CPJ 42.5", unit: "t", quantity: 12 },
    { ...pj, purchase_request_id: pr.id, description: "Acier HA 12", unit: "kg", quantity: 1500 },
  ]);
  const [po] = await insert("purchase_orders", [
    { ...pj, supplier_id: sup[0].id, purchase_request_id: pr.id, order_date: daysAgo(8), expected_date: daysAgo(3), status: "sent" },
  ]);
  const pol = await insert("purchase_order_lines", [
    {
      ...pj,
      purchase_order_id: po.id,
      description: "Ciment CPJ 42.5",
      unit: "t",
      quantity: 12,
      unit_price: 26000,
      boq_item_id: items[0]?.id ?? null,
    },
    {
      ...pj,
      purchase_order_id: po.id,
      description: "Acier HA 12",
      unit: "kg",
      quantity: 1500,
      unit_price: 230,
      boq_item_id: items[0]?.id ?? null,
    },
  ]);
  await db.from("purchase_requests").update({ status: "ordered" }).eq("id", pr.id).then(must("pr ordered"));
  const [dl] = await insert("deliveries", [
    {
      ...pj,
      created_by: ids.store,
      purchase_order_id: po.id,
      location_id: loc.id,
      delivery_date: daysAgo(4),
      delivery_note: "BL 2026-118",
    },
  ]);
  await insert("delivery_lines", [
    {
      ...pj,
      created_by: ids.store,
      delivery_id: dl.id,
      purchase_order_line_id: pol[0].id,
      description: pol[0].description,
      unit: "t",
      quantity_received: 8,
    },
    {
      ...pj,
      created_by: ids.store,
      delivery_id: dl.id,
      purchase_order_line_id: pol[1].id,
      description: pol[1].description,
      unit: "kg",
      quantity_received: 1500,
    },
  ]);
  await insert("stock_movements", [
    {
      ...pj,
      created_by: ids.store,
      location_id: loc.id,
      kind: "out",
      movement_date: daysAgo(2),
      item_name: "Ciment CPJ 42.5",
      unit: "t",
      quantity: 5.5,
      boq_item_id: items[0]?.id ?? null,
    },
  ]);
  await insert("stock_thresholds", [{ ...pj, location_id: loc.id, item_name: "Ciment CPJ 42.5", unit: "t", min_quantity: 3 }]);

  console.log("→ costs and subcontracts");
  await insert("expenses", [
    {
      ...pj,
      expense_date: daysAgo(30),
      category: "site_overheads",
      description: "Location bungalow de chantier",
      amount: 180000,
      supplier_id: null,
    },
    { ...pj, expense_date: daysAgo(12), category: "transport", description: "Transport agrégats", amount: 95000 },
    { ...pj, expense_date: daysAgo(6), category: "fees", description: "Essais laboratoire béton", amount: 60000 },
  ]);
  const [sc] = await insert("subcontracts", [
    { ...pj, supplier_id: sup[2].id, title: "Étanchéité toiture", amount: 1950000, retention_rate: 5, status: "active" },
  ]);
  await insert("subcontractor_claims", [{ ...pj, subcontract_id: sc.id, claim_date: daysAgo(3), amount: 400000, status: "approved" }]);

  console.log("→ labour and payroll");
  const workers = await insert("workers", [
    { ...by, full_name: "Abdi Moussa", trade: "mason", daily_rate: 4000 },
    { ...by, full_name: "Hassan Ibrahim", trade: "mason", daily_rate: 4000 },
    { ...by, full_name: "Idriss Farah", trade: "ironworker", daily_rate: 4500 },
    { ...by, full_name: "Mohamed Daher", trade: "labourer", daily_rate: 2500 },
    { ...by, full_name: "Saïd Omar", trade: "labourer", daily_rate: 2500 },
    { ...by, full_name: "Kadar Robleh", trade: "operator", daily_rate: 6000 },
  ]);
  const att = [];
  for (let d = 10; d >= 1; d--)
    for (const w of workers)
      att.push({
        ...pj,
        created_by: ids.foreman,
        worker_id: w.id,
        work_date: daysAgo(d),
        days: d === 3 && w.trade === "labourer" ? 0.5 : 1,
        overtime_hours: d === 2 ? 2 : 0,
      });
  await insert("attendance", att);
  await insert("advances", [{ ...by, worker_id: workers[0].id, advance_date: daysAgo(5), amount: 10000 }]);
  const month = daysAgo(0).slice(0, 7);
  const [period] = await insert("payroll_periods", [
    { ...by, name: month, start_date: daysAgo(30), end_date: daysAgo(0), currency: "DJF" },
  ]);
  await insert(
    "payroll_lines",
    workers.map((w) => ({ ...by, payroll_period_id: period.id, worker_id: w.id, daily_rate: w.daily_rate })),
  );

  console.log("→ equipment");
  const eq = await insert("equipment", [
    { ...by, code: "PEL-01", name: "Pelle hydraulique 20 t", category: "Terrassement", hourly_rate: 18000, ownership: "rented" },
    { ...by, code: "BET-01", name: "Bétonnière 350 L", category: "Béton", hourly_rate: 1200 },
  ]);
  await insert("equipment_logs", [
    {
      ...pj,
      created_by: ids.foreman,
      equipment_id: eq[0].id,
      log_date: daysAgo(30),
      hours: 7,
      fuel_litres: 90,
      operator_name: "Kadar Robleh",
    },
    { ...pj, created_by: ids.foreman, equipment_id: eq[1].id, log_date: daysAgo(3), hours: 6, fuel_litres: 8 },
  ]);
  await insert("maintenance_records", [{ ...by, equipment_id: eq[1].id, title: "Vidange moteur", due_date: daysAgo(-5) }]);

  console.log("→ progress claim");
  const settings = await db.from("project_settings").select("*").eq("project_id", projectId).single().then(must("settings"));
  const values = await db
    .from("boq_item_values")
    .select("id, effective_unit_price")
    .in(
      "id",
      items.map((i) => i.id),
    )
    .then(must("prices")); // invoker view: service role bypasses RLS
  const [claim] = await insert("progress_claims", [
    {
      ...pj,
      number: 1,
      period_start: daysAgo(40),
      period_end: daysAgo(1),
      retention_rate: settings.retention_rate,
      advance_recovery_rate: settings.advance_recovery_rate,
      vat_rate: settings.vat_rate,
    },
  ]);
  // Views filter on the signed-in user; the service role has none, so sum the entries here.
  const entries = await db
    .from("progress_entries")
    .select("boq_item_id, quantity")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .then(must("progress"));
  const doneBy = new Map();
  for (const e of entries) doneBy.set(e.boq_item_id, (doneBy.get(e.boq_item_id) ?? 0) + Number(e.quantity));
  await insert(
    "progress_claim_lines",
    values.map((v) => ({
      ...pj,
      claim_id: claim.id,
      boq_item_id: v.id,
      cumulative_quantity: doneBy.get(v.id) ?? 0,
      previous_quantity: 0,
      unit_price: v.effective_unit_price ?? 0,
    })),
  );
  await db.from("progress_claims").update({ status: "submitted" }).eq("id", claim.id).then(must("claim submitted"));

  console.log("→ documents and quality");
  await insert("rfis", [
    {
      ...pj,
      created_by: ids.pm,
      subject: "Enrobage des fondations",
      question: "Confirmer l'enrobage de 5 cm en milieu agressif ?",
      addressed_to: "Bureau de contrôle",
      due_date: daysAgo(-4),
    },
  ]);
  await insert("drawing_revisions", [
    { ...pj, drawing_number: "GO-101", title: "Plan de fondations", discipline: "Structure", revision: "A", issued_date: daysAgo(45) },
    { ...pj, drawing_number: "GO-101", title: "Plan de fondations", discipline: "Structure", revision: "B", issued_date: daysAgo(20) },
  ]);
  const [tpl] = await insert("checklist_templates", [
    {
      ...by,
      name: "Avant coulage béton",
      category: "Gros œuvre",
      items: [
        "Coffrage propre et huilé",
        "Armatures conformes au plan",
        "Enrobage respecté (cales)",
        "Réservations en place",
        "Accord du bureau de contrôle",
      ].map((label) => ({ label })),
    },
  ]);
  await insert("inspections", [
    {
      ...pj,
      template_id: tpl.id,
      title: "Semelles bloc A",
      inspection_date: daysAgo(25),
      status: "passed",
      results: tpl.items.map((i) => ({ label: i.label, result: "pass", note: "" })),
    },
  ]);
  await insert("safety_observations", [
    {
      ...pj,
      created_by: ids.foreman,
      observed_on: daysAgo(2),
      kind: "unsafe_condition",
      severity: "medium",
      description: "Trémie non protégée au R+1",
      action: "Pose de garde-corps",
      status: "open",
    },
  ]);
}

main().catch((e) => {
  console.error("✗", e.message);
  process.exit(1);
});
