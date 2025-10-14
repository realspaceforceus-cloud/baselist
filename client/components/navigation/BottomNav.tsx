import type { LucideIcon } from "lucide-react";
import { House, MessageSquare, PlusCircle, User } from "lucide-react";
import { NavLink } from "react-router-dom";

import { useBaseList } from "@/context/BaseListContext";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    label: "Home",
    to: "/",
    icon: House,
    end: true,
  },
  {
    label: "Post",
    to: "/post",
    icon: PlusCircle,
  },
  {
    label: "Messages",
    to: "/messages",
    icon: MessageSquare,
  },
  {
    label: "Profile",
    to: "/profile",
    icon: User,
  },
];

export const BottomNav = (): JSX.Element => {
  const { unreadMessageCount } = useBaseList();

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-4 z-50 px-4">
      <div className="pointer-events-auto mx-auto flex w-full max-w-lg items-center justify-between rounded-full border border-nav-border bg-nav/95 px-3 py-2 shadow-soft backdrop-blur">
        {NAV_ITEMS.map(({ label, to, icon: Icon, end = false }) => (
          <NavLink
            key={label}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex flex-1 flex-col items-center justify-center gap-1 rounded-full px-3 py-2 text-xs font-medium tracking-wide transition",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )
            }
          >
            {({ isActive }) => {
              const unreadForItem = label === "Messages" ? unreadMessageCount : 0;
              const showUnread = unreadForItem > 0;

              return (
                <>
                  <span
                    className={cn(
                      "relative flex h-9 w-9 items-center justify-center rounded-full border border-transparent bg-transparent transition",
                      isActive ? "bg-primary/10 text-primary" : "bg-transparent",
                    )}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                    {showUnread ? (
                      <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-[0.2rem] text-[0.65rem] font-semibold leading-none text-background">
                        {Math.min(unreadForItem, 9)}
                      </span>
                    ) : null}
                  </span>
                  <span>{label}</span>
                </>
              );
            }}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
