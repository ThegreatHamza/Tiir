import type * as React from "react";
import { createBrowserRouter, Navigate, type RouteObject } from "react-router-dom";
import { RequireAuth, RequireCompany, RequireRole, RedirectIfAuthed } from "@/features/auth/guards";
import { LoginPage } from "@/features/auth/LoginPage";
import { SignupPage } from "@/features/auth/SignupPage";
import { ForgotPasswordPage } from "@/features/auth/ForgotPasswordPage";
import { SetPasswordPage } from "@/features/auth/SetPasswordPage";
import { OnboardingPage } from "@/features/companies/OnboardingPage";
import { ProjectsPage } from "@/features/projects/ProjectsPage";
import { ProjectDetailPage } from "@/features/projects/ProjectDetailPage";
import { ProjectLayout } from "@/features/projects/ProjectLayout";
import { PROJECT_MODULES } from "@/features/projects/modules";
import { ClientsPage } from "@/features/clients/ClientsPage";
import { MembersPage } from "@/features/members/MembersPage";
import { CompanySettingsPage } from "@/features/settings/CompanySettingsPage";
import { AccountPage } from "@/features/account/AccountPage";
import type { AppRole } from "@/lib/roles";
import { AppShell } from "./shell/AppShell";
import { NotFoundPage, RouteErrorPage } from "./ErrorPages";
import { Root } from "./Root";
import { HomeRedirect } from "./HomeRedirect";

/** Roles allowed to see prices and costs (mirrors can_see_costs in SQL). */
const COST_ROLES: AppRole[] = ["owner", "admin", "project_manager", "estimator", "accountant"];
const FINANCE_ROLES: AppRole[] = ["owner", "admin", "accountant"];
const STAFF: AppRole[] = ["owner", "admin", "project_manager", "estimator", "site_foreman", "storekeeper", "accountant"];

/** Lazily loaded screen, guarded by role. Heavy modules never reach site phones unless opened. */
function lazy(path: string, roles: readonly AppRole[], load: () => Promise<React.ComponentType>): RouteObject {
  return {
    path,
    lazy: async () => {
      const Component = await load();
      return {
        element: (
          <RequireRole roles={roles}>
            <Component />
          </RequireRole>
        ),
      };
    },
  };
}

const rolesOf = (path: string) => PROJECT_MODULES.find((m) => m.path === path)?.roles ?? [];

export const router = createBrowserRouter([
  {
    element: <Root />,
    errorElement: <RouteErrorPage />,
    children: [
      {
        path: "/login",
        element: (
          <RedirectIfAuthed>
            <LoginPage />
          </RedirectIfAuthed>
        ),
      },
      {
        path: "/signup",
        element: (
          <RedirectIfAuthed>
            <SignupPage />
          </RedirectIfAuthed>
        ),
      },
      { path: "/forgot-password", element: <ForgotPasswordPage /> },
      { path: "/reset-password", element: <SetPasswordPage mode="reset" /> },
      { path: "/accept-invite", element: <SetPasswordPage mode="invite" /> },
      {
        element: <RequireAuth />,
        children: [
          { path: "/onboarding", element: <OnboardingPage /> },
          {
            element: <RequireCompany />,
            children: [
              {
                element: <AppShell />,
                children: [
                  { index: true, element: <HomeRedirect /> },
                  lazy("/dashboard", COST_ROLES, async () => (await import("@/features/dashboard/CompanyDashboard")).CompanyDashboard),
                  lazy("/portal", ["client_viewer"], async () => (await import("@/features/portal/ClientPortal")).ClientPortal),
                  { path: "/projects", element: <ProjectsPage /> },
                  {
                    path: "/projects/:projectId",
                    element: <ProjectLayout />,
                    children: [
                      { index: true, element: <ProjectDetailPage /> },
                      lazy("estimate", rolesOf("estimate"), async () => (await import("@/features/estimating/EstimatePage")).EstimatePage),
                      lazy("planning", rolesOf("planning"), async () => (await import("@/features/planning/PlanningPage")).PlanningPage),
                      lazy("site", rolesOf("site"), async () => (await import("@/features/site/SitePage")).SitePage),
                      lazy(
                        "site/report/:reportId",
                        rolesOf("site"),
                        async () => (await import("@/features/site/DailyReportForm")).DailyReportForm,
                      ),
                      lazy("issues", rolesOf("issues"), async () => (await import("@/features/issues/IssuesPage")).IssuesPage),
                      lazy("costs", rolesOf("costs"), async () => (await import("@/features/costs/CostsPage")).CostsPage),
                      lazy("billing", rolesOf("billing"), async () => (await import("@/features/billing/BillingPage")).BillingPage),
                      lazy(
                        "billing/claims/:claimId",
                        rolesOf("billing"),
                        async () => (await import("@/features/billing/ClaimPage")).ClaimPage,
                      ),
                      lazy(
                        "procurement",
                        rolesOf("procurement"),
                        async () => (await import("@/features/procurement/ProcurementPage")).ProcurementPage,
                      ),
                      lazy(
                        "procurement/orders/:orderId",
                        rolesOf("procurement"),
                        async () => (await import("@/features/procurement/OrderPage")).OrderPage,
                      ),
                      lazy("stock", rolesOf("stock"), async () => (await import("@/features/stock/StockPage")).StockPage),
                      lazy("labour", rolesOf("labour"), async () => (await import("@/features/labour/AttendancePage")).AttendancePage),
                      lazy(
                        "equipment",
                        rolesOf("equipment"),
                        async () => (await import("@/features/equipment/EquipmentLogsPage")).EquipmentLogsPage,
                      ),
                      lazy(
                        "subcontracts",
                        rolesOf("subcontracts"),
                        async () => (await import("@/features/billing/SubcontractsPage")).SubcontractsPage,
                      ),
                      lazy(
                        "documents",
                        rolesOf("documents"),
                        async () => (await import("@/features/documents/DocumentsPage")).DocumentsPage,
                      ),
                      lazy("quality", rolesOf("quality"), async () => (await import("@/features/quality/QualityPage")).QualityPage),
                      lazy(
                        "reports",
                        rolesOf("reports"),
                        async () => (await import("@/features/dashboard/ProjectDashboard")).ProjectDashboard,
                      ),
                    ],
                  },
                  lazy("/price-library", COST_ROLES, async () => (await import("@/features/estimating/PriceLibraryPage")).PriceLibraryPage),
                  lazy(
                    "/suppliers",
                    ["owner", "admin", "project_manager", "storekeeper", "accountant", "estimator"],
                    async () => (await import("@/features/procurement/SuppliersPage")).SuppliersPage,
                  ),
                  lazy(
                    "/workers",
                    ["owner", "admin", "project_manager", "site_foreman", "accountant"],
                    async () => (await import("@/features/labour/WorkersPage")).WorkersPage,
                  ),
                  lazy("/payroll", FINANCE_ROLES, async () => (await import("@/features/labour/PayrollPage")).PayrollPage),
                  lazy(
                    "/payroll/:periodId",
                    FINANCE_ROLES,
                    async () => (await import("@/features/labour/PayrollPeriodPage")).PayrollPeriodPage,
                  ),
                  lazy("/equipment", STAFF, async () => (await import("@/features/equipment/EquipmentPage")).EquipmentPage),
                  lazy(
                    "/checklists",
                    ["owner", "admin", "project_manager"],
                    async () => (await import("@/features/quality/ChecklistTemplatesPage")).ChecklistTemplatesPage,
                  ),
                  lazy("/calendars", STAFF, async () => (await import("@/features/calendars/CalendarsPage")).CalendarsPage),
                  {
                    path: "/clients",
                    element: (
                      <RequireRole roles={COST_ROLES}>
                        <ClientsPage />
                      </RequireRole>
                    ),
                  },
                  {
                    path: "/members",
                    element: (
                      <RequireRole roles={["owner", "admin"]}>
                        <MembersPage />
                      </RequireRole>
                    ),
                  },
                  {
                    path: "/settings/company",
                    element: (
                      <RequireRole roles={["owner", "admin"]}>
                        <CompanySettingsPage />
                      </RequireRole>
                    ),
                  },
                  { path: "/account", element: <AccountPage /> },
                  { path: "/home", element: <Navigate to="/" replace /> },
                  { path: "*", element: <NotFoundPage /> },
                ],
              },
            ],
          },
        ],
      },
      { path: "*", element: <NotFoundPage standalone /> },
    ],
  },
]);
