import { Building2, FolderKanban, Settings, UserCircle, Users, type LucideIcon } from "lucide-react";
import { can, type AppRole } from "@/lib/roles";

export type NavItem = {
  to: string;
  labelKey: string;
  icon: LucideIcon;
  visible: (role: AppRole) => boolean;
};

export type NavSection = { labelKey: string; items: NavItem[] };

/**
 * Navigation shows only modules that exist. Each phase adds its section here
 * (estimating, planning, site, …) — no placeholder pages.
 */
export const NAV: NavSection[] = [
  {
    labelKey: "nav.sectionWork",
    items: [{ to: "/projects", labelKey: "nav.projects", icon: FolderKanban, visible: () => true }],
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
