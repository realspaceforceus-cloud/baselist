import type { LucideIcon } from "lucide-react";
import { Users } from "lucide-react";

import { AdminSectionHeader } from "@/components/admin/AdminSectionHeader";

export interface AdminRole {
  name: string;
  scope: "Global" | "Base";
  permissions: string[];
  icon: LucideIcon;
  toneClass?: string;
}

interface RolesSectionProps {
  roles: AdminRole[];
}

export const RolesSection = ({ roles }: RolesSectionProps): JSX.Element => {
  return (
    <section className="space-y-4">
      <AdminSectionHeader title="Moderator Roles" subtitle="Roles" accent="Access" />
      <div className="grid gap-4 md:grid-cols-2">
        {roles.map((role) => {
          const Icon = role.icon;

          return (
            <article
              key={role.name}
              className="rounded-3xl border border-border bg-background/90 p-4 shadow-soft"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{role.name}</h3>
                    <p className="text-xs text-muted-foreground">Permission scope</p>
                  </div>
                </div>
                <span className={`text-xs font-semibold uppercase tracking-wide ${role.toneClass ?? "text-muted-foreground"}`}>
                  {role.scope}
                </span>
              </div>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                {role.permissions.map((permission) => (
                  <li key={permission} className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-muted-foreground/70" aria-hidden />
                    {permission}
                  </li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
};
