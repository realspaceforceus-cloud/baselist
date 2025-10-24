import { Home, ShoppingBag, MessageSquare, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

export const BottomNav = (): JSX.Element | null => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const navItems = [
    { icon: Home, label: "Feed", href: "/" },
    { icon: ShoppingBag, label: "Marketplace", href: "/marketplace" },
    { icon: MessageSquare, label: "Messages", href: "/messages" },
    { icon: User, label: "Profile", href: `/profile/${user.username}` },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-background md:hidden">
      <div className="flex items-center justify-around">
        {navItems.map(({ icon: Icon, label, href }) => {
          const isActive = location.pathname === href;
          return (
            <Link
              key={href}
              to={href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-3 transition",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
