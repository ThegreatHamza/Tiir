# DECISIONS

Assumptions and choices made where the specification was silent or ambiguous.
The rule applied each time: pick the simplest option and write it down.

## Phase 0 — foundation

### Brand
- **Colours** were sampled from the supplied logo: navy `#0B2845`, amber `#F3A00B`. They are defined once, in `tailwind.config.ts` (`brand`), and every other colour token (light and dark themes, shadcn variables) is derived from them there.
- **Logo files.** The logo is used unchanged. The only processing was cropping away the empty margin, cropping the square "pillars" mark from the same file for the favicon and PWA icons, making the outer white background transparent, and downscaling for the web. Nothing was redrawn or recoloured. The untouched original is kept at `public/brand/tiir-logo-original.png`.
- The navy wordmark is unreadable on navy or dark backgrounds, so the full logo is shown on a **white plate** in the sidebar and in dark mode rather than recoloured.
- **No web fonts.** Fonts come from the system (Inter or Noto Sans Arabic when installed, otherwise system-ui and Tahoma). Downloading fonts would slow first load on weak site connections and break offline use.

### Languages and formats
- French is the fallback language. The language is chosen in this order: the user's own choice, then the company default, then French. Before sign-in, the last language picked on that device is used.
- **Arabic shows Latin digits** (`ar-DJ-u-nu-latn`). Construction figures and codes are shared with French-speaking partners, and mixing digit systems in a bill of quantities causes errors. Codes, phone numbers and dates stay left-to-right inside RTL text.
- **Dates are always shown as dd/mm/yyyy**, whatever the browser locale. Date inputs use a text field in that format, plus a button that opens the phone's native date picker.
- SQL `date` values are shown exactly as stored, with no time-zone shift. Timestamps are shown in the company time zone, `Africa/Djibouti` by default and `Africa/Addis_Ababa` for Ethiopian companies.
- Money is rounded half away from zero to the currency's decimals: 0 for DJF, 2 for ETB and USD. Totals are summed in minor units so that a total always equals the sum of its printed lines.
- Units use internal codes `m, m2, m3, kg, t, u, ml, ff` (u = unit, ml = linear metre, ff = lump sum / forfait). Their labels are in the translation files.
- The French construction vocabulary (DQE, métré, sous-détail de prix, déboursé sec, situation de travaux, retenue de garantie, attachement, PV de réception) and its equivalents in the three other languages are in a `glossary` section of each translation file, ready for the later phases.
- The **Somali and Arabic** construction terms are a best effort and should be reviewed by a native-speaking practitioner.

### Tenancy, roles and security
- A **new company starts with every rate at 0 and a coefficient of 1**. The owner sets VAT, retention and the coefficient in Settings. No country's tax rate is assumed.
- New projects **copy the company's default rates** into `project_settings` when they are created. Editing the company defaults later does not change existing projects.
- A **project's currency is fixed once it is created**, enforced by a trigger, because every amount in the project depends on it.
- **Project managers can create projects** and are assigned to them automatically. Only owners and admins see every project; everyone else sees only the projects they are assigned to.
- **Only owners grant, change or remove the owner and admin roles.** Admins manage every other role. Nobody can change their own role or status, and a company always keeps at least one active owner. All of this is enforced in the database (`tg_company_members_guard`), not only in the UI.
- **Client viewers** see only their assigned projects and their own membership, and never see clients, rates or other members. Their read access to progress, photos, claims and documents arrives with those modules.
- **Site foremen and storekeepers cannot read `company_settings` or `project_settings`**, because rates and the price coefficient are pricing data. From Phase 1, prices reach them only through views that leave out the cost columns.
- **Soft delete.** There are no DELETE policies, and `DELETE`/`TRUNCATE` are revoked from the API roles. Rows are hidden by setting `deleted_at`. Owners and admins can show and restore deleted rows. The single exception is files in storage: a superseded file, such as an old logo, can be removed by someone with write access to its path.
- **Audit log.** Writes to the Phase 0 tables are recorded by a trigger in `audit_log`, which only owners and admins can read. Later phases attach the same trigger to their tables.
- **Storage** uses one private bucket, `tiir`, with paths `company_id/project_id|_company/module/file`. Files under the modules `payroll` and `finance` are readable only by owners, admins and accountants. Client viewers never upload.
- The **list views** (`project_list`, `company_member_directory`) are `security_invoker`, so the caller's RLS applies to them.

### Auth and onboarding
- Sign-up asks for the company name, country and currency. A database trigger creates the profile, the company, the owner membership and the settings row in the same transaction.
- A user **with no company** (for example someone invited, or a former member) lands on an onboarding page where they can accept pending invitations or create a company.
- **Invitations** are rows in `company_invitations`, valid for 14 days. The `invite-member` Edge Function exists only because sending the email needs the admin API. The function first calls `create_invitation()` with the caller's own JWT, so the permission checks run in Postgres. If the function is not deployed, the app still creates the invitation, and the invited person sees it in the app once they sign up with that email.
- Invited people who are new to Tiir follow the email link to `/accept-invite`, set a password and their name, then accept the invitation.
- **Session expiry:** access tokens last 1 hour and refresh automatically. Sessions end after 7 days of inactivity (`config.toml`). An unexpected sign-out shows a "session expired" message and returns the user to sign-in, then to the page they were on.
- Email changes need confirmation from both addresses (`double_confirm_changes`). `profiles.email` follows `auth.users.email` through a trigger.

### Lists and exports
- Lists are **paginated, searched, filtered and sorted on the server**. Search uses quoted PostgREST `ilike` filters, so commas and parentheses in user input cannot inject other filters. Sorting is limited to a whitelist of columns. List state lives in the URL, so it survives a reload and can be shared.
- **Excel export** writes every row that matches the current filters (up to 10,000) with translated headers. SheetJS loads only when someone exports.
- **SheetJS version:** the official 0.20.x build is distributed from `cdn.sheetjs.com`, which this build environment cannot reach, so the npm package `xlsx@0.18.5` is installed. Tiir only writes files with it in Phase 0. Before Phase 1 adds Excel import, switch to the CDN build: `npm i https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`. The known advisories for 0.18.5 concern parsing untrusted files.
- On phones, lists show as cards instead of tables.

### Tooling
- `@hookform/resolvers` v5 is used instead of v3, so that forms can type text inputs and numeric outputs separately (rates are typed as text and accept "," or "." as the decimal separator).
- **Generated types:** `src/types/database.ts` was generated by the Supabase CLI from the migrations. Regenerate it with `npm run db:types` after each schema change.
- **RLS tests** are plain SQL assertions (`supabase/tests/rls_test.sql`) rather than pgTAP. They run on a local Supabase stack, and on plain Postgres through a small shim of the Supabase `auth` and `storage` schemas (`supabase/tests/shim/`, used only for tests and never applied to a real project). CI uses the plain-Postgres path.
- The PWA **manifest and icons** are shipped now so the app can be installed. The service worker and offline queue come in Phase 3, as the build order says.
