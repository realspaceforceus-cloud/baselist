import { useMemo, useState } from "react";
import {
  BarChart3,
  Building2,
  Gauge,
  LockKeyhole,
  MessageSquareWarning,
  ShieldAlert,
  UserCheck,
  UserCog,
  Users2,
} from "lucide-react";

import { AdminSidebar, type AdminNavItem } from "@/components/admin/AdminSidebar";
import {
  BasesSection,
  DashboardSection,
  ListingsSection,
  MessagingSection,
  MetricsSection,
  ReportsSection,
  RolesSection,
  SecuritySection,
  UsersSection,
  VerificationSection,
} from "@/components/admin/sections";
import { useBaseList } from "@/context/BaseListContext";

const sections: AdminNavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: Gauge },
  { id: "users", label: "Users", icon: Users2 },
  { id: "listings", label: "Listings", icon: UserCheck },
  { id: "reports", label: "Reports", icon: ShieldAlert },
  { id: "verification", label: "Verification", icon: UserCog },
  { id: "bases", label: "Bases", icon: Building2 },
  { id: "messaging", label: "Messaging", icon: MessageSquareWarning },
  { id: "metrics", label: "Metrics", icon: BarChart3 },
  { id: "roles", label: "Roles", icon: UserCog },
  { id: "security", label: "Security", icon: LockKeyhole },
];

const sectionComponents: Record<string, () => JSX.Element> = {
  dashboard: DashboardSection,
  users: UsersSection,
  listings: ListingsSection,
  reports: ReportsSection,
  verification: VerificationSection,
  bases: BasesSection,
  messaging: MessagingSection,
  metrics: MetricsSection,
  roles: RolesSection,
  security: SecuritySection,
};

const AdminPanel = (): JSX.Element => {
  const { user } = useBaseList();
  const [activeSection, setActiveSection] = useState<string>(sections[0]?.id ?? "dashboard");

  const ActiveSection = useMemo(() => sectionComponents[activeSection] ?? DashboardSection, [activeSection]);

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-border bg-card p-6 shadow-card">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1.5">
            <h1 className="text-3xl font-semibold text-foreground">BaseList Admin Panel</h1>
            <p className="text-sm text-muted-foreground">
              Simple, fast, and auditable controls for every base. All actions are logged for 90 days.
            </p>
          </div>
          <div className="flex flex-col items-start gap-1 rounded-2xl border border-dashed border-nav-border bg-background/70 px-4 py-3 text-xs font-semibold text-muted-foreground">
            <span className="text-foreground">Signed in as {user.name}</span>
            <span className="flex items-center gap-2 text-muted-foreground/80">
              <span className="inline-flex h-2 w-2 rounded-full bg-verified" />
              Role • {user.role?.toUpperCase?.() ?? "ADMIN"}
            </span>
          </div>
        </div>
      </header>
      <div className="grid gap-6 lg:grid-cols-[18rem,1fr]">
        <AdminSidebar items={sections} activeId={activeSection} onSelect={setActiveSection} />
        <div className="space-y-8">
          <ActiveSection />
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
