import { useMemo, useState } from "react";
import {
  ClipboardList,
  Gauge,
  House,
  LogOut,
  MessageSquare,
  PlusCircle,
  ShieldCheck,
  User,
} from "lucide-react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";

import { BaseSelector } from "@/components/layout/BaseSelector";
import { SearchInput } from "@/components/layout/SearchInput";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useBaseList } from "@/context/BaseListContext";
import { useAuthDialog } from "@/context/AuthDialogContext";

const LOGO_SRC =
  "https://cdn.builder.io/api/v1/image/assets%2F1286fd005baa4e368e0e4e8dfaf9c2e8%2F9f8d10811f0e4d94a520d1b0b4d411e2?format=webp&width=320";

const NAV_ITEMS = [
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
] as const;

const QUICK_ACTIONS = [
  {
    label: "Create listing",
    to: "/post",
    icon: PlusCircle,
  },
  {
    label: "Messages",
    to: "/messages",
    icon: MessageSquare,
  },
] as const;

const MENU_SHORTCUTS = [
  {
    label: "My listings",
    description: "Track active and sold posts.",
    to: "/profile",
    icon: ClipboardList,
  },
  {
    label: "Messages",
    description: "Catch up with buyers and sellers.",
    to: "/messages",
    icon: MessageSquare,
  },
  {
    label: "Create listing",
    description: "Post something new for your base.",
    to: "/post",
    icon: PlusCircle,
  },
] as const;

const getAvatarInitials = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "BL";
  }
  const words = trimmed.replace(/[_-]+/g, " ").split(" ");
  const letters = words.filter(Boolean).map((word) => word[0]?.toUpperCase() ?? "");
  if (letters.length > 1) {
    return (letters[0] + letters[1]).slice(0, 2);
  }
  const fallback = trimmed.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2);
  return fallback ? fallback.toUpperCase() : trimmed.slice(0, 2).toUpperCase();
};

export const Header = (): JSX.Element => {
  const { user, isDowVerified, isAuthenticated, signOut } = useBaseList();
  const { openSignIn } = useAuthDialog();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setMenuOpen] = useState(false);

  const showAdminLink = user.role === "admin";
  const avatarInitials = getAvatarInitials(user.name);
  const verificationLabel = isDowVerified ? "Verified" : user.verificationStatus;
  const showSearch = isAuthenticated && location.pathname === "/";

  const menuShortcuts = useMemo(() => {
    if (!showAdminLink) {
      return MENU_SHORTCUTS;
    }

    return [
      ...MENU_SHORTCUTS,
      {
        label: "Admin",
        description: "Moderate members and reports.",
        to: "/admin",
        icon: Gauge,
      } as const,
    ];
  }, [showAdminLink]);

  const handleNavigate = (to: string) => {
    setMenuOpen(false);
    navigate(to);
  };

  const logo = (
    <Link to="/" className="flex items-center" aria-label="BaseList home">
      <img src={LOGO_SRC} alt="BaseList" className="h-8 w-auto object-contain md:h-9" />
    </Link>
  );

  if (!isAuthenticated) {
    return (
      <header className="sticky top-0 z-30 border-b border-nav-border bg-background/95 backdrop-blur-lg">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 md:py-5">
          {logo}
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              className="rounded-full px-4 py-2 text-sm font-semibold"
              type="button"
              onClick={openSignIn}
            >
              Sign In
            </Button>
            <Button asChild className="rounded-full px-5 py-2 text-sm font-semibold">
              <a href="#join">Join Now</a>
            </Button>
          </div>
        </div>
      </header>
    );
  }

  return (
    <Sheet open={isMenuOpen} onOpenChange={setMenuOpen}>
      <header className="sticky top-0 z-30 border-b border-nav-border bg-background/95 backdrop-blur-lg">
        <div className="mx-auto w-full max-w-6xl px-4 py-3 md:py-5">
          <div className="flex flex-col gap-3 md:gap-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <SheetTrigger asChild>
                  <button
                    type="button"
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background shadow-soft transition hover:-translate-y-0.5 hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    <Avatar className="h-9 w-9">
                      {user.avatarUrl ? (
                        <AvatarImage src={user.avatarUrl} alt={`${user.name} avatar`} />
                      ) : (
                        <AvatarFallback className="text-sm font-semibold uppercase tracking-wide text-foreground">
                          {avatarInitials}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <span className="sr-only">Open menu</span>
                  </button>
                </SheetTrigger>
                <span className="text-lg font-semibold text-foreground">BaseList</span>
              </div>
              <div className="flex items-center gap-2">
                {QUICK_ACTIONS.map(({ label, to, icon: Icon }) => (
                  <button
                    key={label}
                    type="button"
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-soft transition hover:-translate-y-0.5 hover:text-primary"
                    onClick={() => handleNavigate(to)}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                    <span className="sr-only">{label}</span>
                  </button>
                ))}
              </div>
            </div>
            <nav className="flex items-center justify-between gap-2 rounded-2xl border border-nav-border bg-nav/70 px-2 py-2 shadow-soft">
              {NAV_ITEMS.map(({ label, to, icon: Icon, end = false }) => (
                <NavLink
                  key={label}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    cn(
                      "flex flex-1 flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-wide transition",
                      isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-full",
                          isActive ? "bg-primary/10 text-primary" : "bg-transparent",
                        )}
                      >
                        <Icon className="h-5 w-5" aria-hidden />
                      </span>
                      {label}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
            <div className="w-full">
              <BaseSelector />
            </div>
          </div>
          {showSearch ? (
            <div className="mt-3 w-full">
              <SearchInput />
            </div>
          ) : null}
        </div>
      </header>
      <SheetContent side="left" className="flex h-full w-full flex-col gap-6 bg-background p-6">
        <SheetHeader className="items-start text-left">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              {user.avatarUrl ? (
                <AvatarImage src={user.avatarUrl} alt={`${user.name} avatar`} />
              ) : (
                <AvatarFallback className="text-base font-semibold uppercase tracking-wide text-foreground">
                  {avatarInitials}
                </AvatarFallback>
              )}
            </Avatar>
            <div>
              <SheetTitle className="text-xl font-semibold text-foreground">{user.name}</SheetTitle>
              <SheetDescription className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck
                  className={cn("h-4 w-4", isDowVerified ? "text-verified" : "text-warning")}
                  aria-hidden
                />
                {verificationLabel}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>
        <div className="space-y-5 overflow-y-auto">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
              Shortcuts
            </h3>
            <div className="mt-3 grid gap-2">
              {menuShortcuts.map(({ label, description, to, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left shadow-soft transition hover:-translate-y-0.5 hover:shadow-card"
                  onClick={() => handleNavigate(to)}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="flex flex-col">
                    <span className="text-sm font-semibold text-foreground">{label}</span>
                    <span className="text-xs text-muted-foreground">{description}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
              Quick tools
            </h3>
            <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
              <p className="text-sm font-semibold text-foreground">Switch base</p>
              <p className="text-xs text-muted-foreground">
                Update your home installation to browse local listings.
              </p>
              <div className="mt-3">
                <BaseSelector />
              </div>
            </div>
          </div>
        </div>
        <div className="mt-auto space-y-2">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 rounded-2xl px-4 py-3 text-sm font-semibold"
            type="button"
            onClick={() => {
              setMenuOpen(false);
              signOut();
            }}
          >
            <LogOut className="h-5 w-5" aria-hidden />
            Sign out
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
