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
- **SheetJS version:** the official 0.20.x build is distributed from `cdn.sheetjs.com`, which the build environment could not reach, so the npm package `xlsx@0.18.5` is installed. Its known advisories (prototype pollution, ReDoS) concern *reading* untrusted files. Since Phase 1, the price-library import reads files. This happens only in the user's own browser tab, on a file they chose, and the parsed rows are validated again in Postgres. Even so, **switch to the official build before production**: `npm i https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`. Nothing else changes.
- On phones, lists show as cards instead of tables.

### Tooling
- `@hookform/resolvers` v5 is used instead of v3, so that forms can type text inputs and numeric outputs separately (rates are typed as text and accept "," or "." as the decimal separator).
- **Generated types:** `src/types/database.ts` was generated by the Supabase CLI from the migrations. Regenerate it with `npm run db:types` after each schema change.
- **RLS tests** are plain SQL assertions (`supabase/tests/rls_test.sql`) rather than pgTAP. They run on a local Supabase stack, and on plain Postgres through a small shim of the Supabase `auth` and `storage` schemas (`supabase/tests/shim/`, used only for tests and never applied to a real project). CI uses the plain-Postgres path.
- The PWA **manifest and icons** are shipped now so the app can be installed. The service worker and offline queue come in Phase 3, as the build order says.

## Phase 1 — estimating

### Data model
- **The price library is company-wide** (`price_resources`). Each resource has one currency. Codes are unique per company, case-insensitive. The Excel import updates a resource whose code already exists, otherwise it creates one.
- **Unit price analyses (sous-détails) belong to a BoQ version**, like sections and items. Copying a version copies its analyses, so every version is a complete, frozen snapshot, and a locked version never changes when something else is edited.
- **Analysis lines keep a snapshot of the resource price** (`unit_price_components.unit_cost`). Changing the library therefore does not silently change an estimate already sent. "Refresh prices from library" pulls the new prices on demand. This price snapshot is the only number copied in Phase 1, and it is copied on purpose. Every total is computed by the views (`upa_values`, `boq_item_values`, `boq_section_totals`, `boq_version_totals`).
- **A resource must be in the project currency** to be used in that project's analyses. The picker only offers resources in that currency. There is no currency conversion in this version.
- **Consumption per unit of work is `numeric(18,4)`.** Ratios such as 0.0125 h/m² need 4 decimals. They are not quantities of work, which stay `numeric(18,3)`.
- **Waste (pertes)** is a percentage on each analysis line: amount = quantity × unit cost × (1 + waste %).
- **Coefficient:** each version stores its own coefficient. It is copied from the project settings when the version is created, can be changed while the version is a draft, and an analysis can override it. Selling price = dry cost × coefficient.
- **The selling price of an item** is chosen in this order: a manual override, then the linked analysis's selling price, then the item's manual dry cost × the coefficient.
- **Item quantity** is either typed in, or the sum of its takeoff lines (`quantity_source`). The two never coexist, so a quantity is never stored twice.
- **Takeoff line result** = count × length × width × height. An empty dimension counts as 1, and a negative count is a deduction. The result is a stored generated column rounded to 3 decimals, and the item quantity is the sum of the results.
- **Rounding** is the same in SQL (`round_money`) and TypeScript (`roundMoney`), half away from zero. Each analysis line is rounded, the dry cost is their sum, then the selling price, then each item total (quantity × price), and section and project totals are sums of rounded lines. `supabase/tests/estimating_test.sql` and `src/lib/calc/estimating.test.ts` check the same worked example (DJF 51 935 HT, 5 194 VAT, 57 129 TTC).
- **Units:** `h` (hour), `day` and `l` (litre) were added to the spec's list, because labour, equipment hire and fuel are priced in them.
- **Sections are one level deep** (section → items). DQE lots with sub-lots can use section codes such as "2.1". Nesting can be added later without changing items.

### Versions
- Statuses are draft → submitted → approved. **Only drafts can be edited**, and a database trigger enforces this on every estimating table. A submitted version can be reopened as a draft; an approved version cannot. Changes after approval require a new version, made by copying the approved one.
- **One "current" version per project** (a unique index). It is the version that budget, progress and billing will use from Phase 4. The first version becomes current automatically.
- **Version comparison** matches items by code, or by description and unit when an item has no code. Results are added, removed, changed and unchanged, with the quantity, price and total differences. It can be exported to Excel.
- **Deleting an analysis** turns its dry cost into a manual unit cost on the items that used it (trigger), so no BoQ line loses its price.

### Who sees what
- Prices, costs, coefficients and margins (the library, analyses, priced items, totals and versions) are visible to owners, admins, project managers, estimators and accountants assigned to the project. Only the first four can edit them.
- Site foremen and storekeepers read the BoQ through `boq_versions_site`, `boq_sections_site` and `boq_items_site`, which have no money columns. A test checks that no column of these views is named like a price, cost, total, coefficient or amount. Client viewers do not see the estimate.

### Editor
- The BoQ editor is spreadsheet-like. Cells turn into inputs on click, Enter saves and Escape cancels. A quick-add row under each section and an item detail dialog (takeoff, analysis, price override, section) complete it.
- **Drag and drop** reorders sections, and items within a section. Moving an item to another section is done from its detail dialog. Reordering is disabled while a search filter is active.
- One edit reloads only the edited row from the value view, not the whole BoQ. Large BoQs load in pages of 1,000 rows. Full performance tuning for 5,000 items is Phase 10.
- "Renumber" recodes sections 1, 2, 3… and items 1.1, 1.2… in display order.

### Exports
- **Excel exports contain live formulas**: line amount `=ROUND(D*E)`, section subtotals `=SUM(...)`, total excl. VAT, VAT and total incl. VAT, so the file still adds up when a price is changed in Excel. The cached values match the app.
- The **unpriced BoQ** (tender) keeps the same formulas with empty price cells, so a bidder only fills the prices.
- **Only selling prices are exported** in BoQs. Dry costs and margins appear only in the unit price analyses export, which is meant for internal use.
- **PDFs use the standard PDF fonts** (no font download, so they work offline). These fonts cannot shape Arabic, so **an Arabic-speaking user gets PDF documents in French**, the business language of contracts in Djibouti. Excel exports are produced in Arabic. Superscripts are written "m2" and "m3" in PDFs for the same font reason.
- Every PDF carries the company header (name, legal name, address, phone, tax ID and the company logo if uploaded), the Tiir logo, the version, client, currency and date, and page numbers.
- The estimating pages, react-pdf and SheetJS load only when they are used, so site phones never download them.
