import {
  BookOpen,
  Building2,
  CalendarDays,
  ClipboardCheck,
  FolderKanban,
  Handshake,
  HardHat,
  LayoutDashboard,
  Settings,
  Truck,
  UserCircle,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { can, type AppRole } from "@/lib/roles";

export type NavItem = {
  to: string;
  labelKey: string;
  icon: LucideIcon;
  visible: (role: AppRole) => boolean;
};

export type NavSection = { labelKey: string; items: NavItem[] };

const is =
  (...roles: AppRole[]) =>
  (r: AppRole) =>
    roles.includes(r);

/**
 * Company-level navigation. Project modules (estimate, planning, site, …) live
 * in the project menu. Each entry mirrors the route guard in router.tsx.
 */
export const NAV: NavSection[] = [
  {
    labelKey: "nav.sectionWork",
    items: [
      { to: "/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard, visible: (r) => can.seeCosts(r) },
      { to: "/portal", labelKey: "nav.portal", icon: LayoutDashboard, visible: is("client_viewer") },
      { to: "/projects", labelKey: "nav.projects", icon: FolderKanban, visible: () => true },
    ],
  },
  {
    labelKey: "nav.sectionResources",
    items: [
      { to: "/price-library", labelKey: "nav.priceLibrary", icon: BookOpen, visible: (r) => can.seeCosts(r) },
      {
        to: "/suppliers",
        labelKey: "nav.suppliers",
        icon: Handshake,
        visible: is("owner", "admin", "project_manager", "storekeeper", "accountant", "estimator"),
      },
      {
        to: "/workers",
        labelKey: "nav.workers",
        icon: HardHat,
        visible: is("owner", "admin", "project_manager", "site_foreman", "accountant"),
      },
      { to: "/payroll", labelKey: "nav.payroll", icon: Wallet, visible: (r) => can.seeFinance(r) },
      { to: "/equipment", labelKey: "nav.equipment", icon: Truck, visible: (r) => r !== "client_viewer" },
      { to: "/checklists", labelKey: "nav.checklists", icon: ClipboardCheck, visible: is("owner", "admin", "project_manager") },
      { to: "/calendars", labelKey: "nav.calendars", icon: CalendarDays, visible: (r) => r !== "client_viewer" },
    ],
  },
  {
    labelKey: "nav.sectionCompany",
    items: [
      { to: "/clients", labelKey: "nav.clients", icon: Building2, visible: (r) => can.seeClients(r) },
      { to: "/members", labelKey: "nav.members", icon: Users, visible: (r) => can.manageMembers(r) },
      { to: "/settings/company", labelKey: "nav.companySettings", icon: Settings, visible: (r) => can.manageCompany(r) },
    ],
  },
  {
    labelKey: "nav.sectionMe",
    items: [{ to: "/account", labelKey: "nav.account", icon: UserCircle, visible: () => true }],
  },
];

export function visibleNav(role: AppRole): NavSection[] {
  return NAV.map((s) => ({ ...s, items: s.items.filter((i) => i.visible(role)) })).filter((s) => s.items.length > 0);
}
