# Tiir

**Tiir** ("pillar" in Somali) is a construction management platform for small and mid-sized contractors in Djibouti and Ethiopia. The estimate, the schedule, the site and the money share one dataset. A quantity entered once in the bill of quantities drives the schedule, site progress, the budget and the client invoice.

French (default), English, Arabic (fully right-to-left) and Somali · DJF, ETB, USD · light and dark themes · built for laptops in the office and Android phones on site.

> **Status: Phase 0 (foundation).** Done: auth, companies, members and roles, projects, clients, settings, Row Level Security, the app shell, four languages. Next: Phase 1 (Estimating). See [Roadmap](#roadmap).

## Stack

React 18 · TypeScript (strict) · Vite · Tailwind CSS · shadcn/ui · React Router · TanStack Query · React Hook Form + Zod · i18next · Supabase (Postgres, Auth, RLS, Storage, Edge Functions) · SheetJS · Vitest.

## Set up a new Supabase project

You need Node 20.12 or later. For the local stack you also need Docker.

### Option A — local Supabase (recommended for development)

```bash
npm install
npx supabase start            # starts Postgres, Auth, Storage, Studio (Docker)
npx supabase db reset         # applies supabase/migrations in order
cp .env.example .env          # paste the API URL, anon key and service_role key printed by `supabase start`
npm run seed                  # demo company, two projects, one user per role
npm run dev                   # http://localhost:5173
```

Emails sent locally (confirmation, invitations, password reset) appear in Inbucket at http://localhost:54324.

### Option B — hosted Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Link it and push the migrations:
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```
3. Deploy the invitation Edge Function:
   ```bash
   npx supabase functions deploy invite-member
   ```
4. In **Authentication → URL configuration**, set the Site URL to your app's address. Add `<site>/reset-password` and `<site>/accept-invite` to the redirect URLs.
5. Copy `.env.example` to `.env`, then fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (**Project settings → API**).
6. Optional demo data: also set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env`, then run `npm run seed`.

> **The service role key bypasses Row Level Security.** It is read only by `scripts/seed.mjs` on your machine and by the Edge Function on Supabase. Never give it a `VITE_` prefix, and never commit it.

### Demo accounts (after `npm run seed`)

Password for all: `Tiir-demo-2026` (change it with `SEED_PASSWORD=...`).

| Role | Email |
|---|---|
| Owner | owner@demo.tiir.dj |
| Project manager | pm@demo.tiir.dj |
| Estimator | metreur@demo.tiir.dj |
| Site foreman | chantier@demo.tiir.dj |
| Storekeeper | magasin@demo.tiir.dj |
| Accountant | compta@demo.tiir.dj |
| Client (read-only) | client@demo.tiir.dj |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run typecheck` | TypeScript, strict |
| `npm test` | Vitest: every calculation and helper function |
| `npm run lint:i18n` | Checks that all 4 languages have the same keys, that every key used in the code exists, and that no text is hard-coded in JSX |
| `npm run build` | Production build |
| `npm run check` | All of the above |
| `npm run db:test` | Applies the migrations and runs the RLS tests against local Supabase |
| `DATABASE_URL=… npm run db:test -- --plain` | Same, against any throwaway Postgres 15+ (no Docker) |
| `npm run db:types` | Regenerates `src/types/database.ts` from the local schema |
| `npm run seed` | Demo data |

## Project layout

```
public/                 favicon, PWA icons, manifest, original logo (public/brand)
src/
  app/                  router, providers, app shell (sidebar, top bar), error pages
  components/ui/        shadcn/ui primitives
  components/common/    DataTable (search, filters, sort, pagination, Excel), states, dialogs
  features/             auth, companies, members, projects, clients, settings, account, notifications
  i18n/locales/         fr.json, en.json, ar.json, so.json
  lib/                  supabase client, roles, formatting, list helpers, export
  lib/calc/             pure, unit-tested calculation functions
  types/database.ts     generated from the schema
supabase/
  migrations/           ordered SQL, safe on an empty project
  functions/            Edge Functions (invite-member)
  tests/rls_test.sql    proves tenant isolation and role limits
scripts/                seed, DB test runner, i18n checker
DECISIONS.md            every assumption made
```

## Security model, in short

- Every row has a `company_id`, and RLS is enabled on every table. The helper functions `is_company_member`, `has_company_role` and `has_project_access` back the policies.
- Owners and admins see the whole company. Everyone else sees only the projects they are assigned to.
- Site foremen, storekeepers and client viewers never see prices, costs or rates. Payroll and company finance are limited to owners, admins and accountants.
- Nothing is hard-deleted through the API. Rows are soft-deleted with `deleted_at`, and the main tables are audited in `audit_log`.
- Storage is private. Paths follow `company_id/project_id/module/file`, files are read through signed URLs, and the storage policies mirror the table policies.
- `supabase/tests/rls_test.sql` proves that a user of company A cannot read or write company B's data, and that a foreman cannot read rates or prices. It also covers the other roles. It runs in CI.

## Roadmap

| Phase | Scope | Status |
|---|---|---|
| 0 | Setup, theme, 4 languages + RTL, auth, companies, members, roles, projects, RLS, app shell | ✅ |
| 1 | Estimating: price library, unit price analysis, takeoff, BoQ editor, exports | ⏳ next |
| 2 | Planning: WBS, Gantt, dependencies, critical path, baselines | |
| 3 | Site: daily reports, PWA, offline queue | |
| 4 | Cost control and billing | |
| 5 | Procurement and stock | |
| 6 | Labour and payroll | |
| 7 | Equipment | |
| 8 | Documents and quality | |
| 9 | Dashboards and client portal | |
| 10 | Hardening | |
