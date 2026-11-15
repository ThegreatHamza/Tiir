import { createBrowserRouter, Navigate } from "react-router-dom";
import { RequireAuth, RequireCompany, RequireRole, RedirectIfAuthed } from "@/features/auth/guards";
import { LoginPage } from "@/features/auth/LoginPage";
import { SignupPage } from "@/features/auth/SignupPage";
import { ForgotPasswordPage } from "@/features/auth/ForgotPasswordPage";
import { SetPasswordPage } from "@/features/auth/SetPasswordPage";
import { OnboardingPage } from "@/features/companies/OnboardingPage";
import { ProjectsPage } from "@/features/projects/ProjectsPage";
import { ProjectDetailPage } from "@/features/projects/ProjectDetailPage";
import { ClientsPage } from "@/features/clients/ClientsPage";
import { MembersPage } from "@/features/members/MembersPage";
import { CompanySettingsPage } from "@/features/settings/CompanySettingsPage";
import { AccountPage } from "@/features/account/AccountPage";
import { AppShell } from "./shell/AppShell";
import { NotFoundPage, RouteErrorPage } from "./ErrorPages";
import { Root } from "./Root";

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
                  { index: true, element: <Navigate to="/projects" replace /> },
                  { path: "/projects", element: <ProjectsPage /> },
                  { path: "/projects/:projectId", element: <ProjectDetailPage /> },
                  {
                    path: "/clients",
                    element: (
                      <RequireRole roles={["owner", "admin", "project_manager", "estimator", "accountant"]}>
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
