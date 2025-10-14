import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export interface AdminNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface AdminSidebarProps {
  items: AdminNavItem[];
  activeId: string;
  onSelect: (id: string) => void;
}

export const AdminSidebar = ({ items, activeId, onSelect }: AdminSidebarProps): JSX.Element => {
  return (
    <nav className="sticky top-24 flex flex-col gap-2 rounded-3xl border border-nav-border bg-card p-3 shadow-soft">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = item.id === activeId;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={cn(
              "flex items-center justify-between gap-3 rounded-2xl px-3 py-2 text-left text-sm font-semibold transition",
              isActive
                ? "bg-primary text-primary-foreground shadow-card"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <span className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              {item.label}
            </span>
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                isActive ? "bg-primary-foreground" : "bg-muted-foreground/50",
              )}
            />
          </button>
        );
      })}
    </nav>
  );
};
