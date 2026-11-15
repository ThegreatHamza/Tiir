import {
  Building,
  Calculator,
  ClipboardCheck,
  ClipboardList,
  FileText,
  GanttChart,
  HardHat,
  LayoutDashboard,
  Package,
  ReceiptText,
  ShoppingCart,
  TriangleAlert,
  Truck,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { AppRole } from "@/lib/roles";

export type ProjectModule = { path: string; labelKey: string; icon: LucideIcon; roles: readonly AppRole[] };

const STAFF: AppRole[] = ["owner", "admin", "project_manager", "estimator", "site_foreman", "storekeeper", "accountant"];
const COST: AppRole[] = ["owner", "admin", "project_manager", "estimator", "accountant"];

/** Modules of a project, in menu order, with the roles that see them (mirrors RLS). */
export const PROJECT_MODULES: ProjectModule[] = [
  { path: "", labelKey: "projectNav.overview", icon: LayoutDashboard, roles: [...STAFF, "client_viewer"] },
  { path: "estimate", labelKey: "projectNav.estimate", icon: Calculator, roles: COST },
  { path: "planning", labelKey: "projectNav.planning", icon: GanttChart, roles: STAFF },
  {
    path: "site",
    labelKey: "projectNav.site",
    icon: HardHat,
    roles: ["owner", "admin", "project_manager", "site_foreman", "estimator", "storekeeper"],
  },
  { path: "issues", labelKey: "projectNav.issues", icon: TriangleAlert, roles: STAFF },
  { path: "costs", labelKey: "projectNav.costs", icon: Wallet, roles: COST },
  { path: "billing", labelKey: "projectNav.billing", icon: ReceiptText, roles: ["owner", "admin", "project_manager", "accountant"] },
  {
    path: "procurement",
    labelKey: "projectNav.procurement",
    icon: ShoppingCart,
    roles: ["owner", "admin", "project_manager", "storekeeper", "accountant"],
  },
  {
    path: "stock",
    labelKey: "projectNav.stock",
    icon: Package,
    roles: ["owner", "admin", "project_manager", "storekeeper", "site_foreman"],
  },
  {
    path: "labour",
    labelKey: "projectNav.labour",
    icon: Users,
    roles: ["owner", "admin", "project_manager", "site_foreman", "accountant"],
  },
  {
    path: "equipment",
    labelKey: "projectNav.equipment",
    icon: Truck,
    roles: ["owner", "admin", "project_manager", "site_foreman", "accountant"],
  },
  { path: "subcontracts", labelKey: "projectNav.subcontracts", icon: Building, roles: COST },
  { path: "documents", labelKey: "projectNav.documents", icon: FileText, roles: STAFF },
  { path: "quality", labelKey: "projectNav.quality", icon: ClipboardCheck, roles: STAFF },
  { path: "reports", labelKey: "projectNav.reports", icon: ClipboardList, roles: COST },
];

export function modulesFor(role: AppRole | null): ProjectModule[] {
  return role ? PROJECT_MODULES.filter((m) => m.roles.includes(role)) : [];
}
