import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Check,
  ClipboardList,
  Gauge,
  House,
  LogOut,
  MapPin,
  Menu,
  MessageSquare,
  Moon,
  PlusCircle,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sun,
  User,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

import { Logo } from "@/components/layout/Logo";
import { SearchInput } from "@/components/layout/SearchInput";
import { NotificationItem } from "@/components/layout/NotificationItem";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useBaseList } from "@/context/BaseListContext";
import { useAuthDialog } from "@/context/AuthDialogContext";
import { useSettings } from "@/context/SettingsContext";
import { notifications as notificationsApi } from "@/lib/api";
import type { Notification } from "@/types";

const NAV_ITEMS = [
  {
    label: "Home",
    to: "/",
    icon: House,
    end: true,
  },
  {
    label: "Marketplace",
    to: "/marketplace",
    icon: ShoppingBag,
  },
  {
    label: "Messages",
    to: "/messages",
    icon: MessageSquare,
  },
  {
    label: "Profile",
    to: "/profile/placeholder", // Dynamic - replaced in render
    icon: User,
  },
] as const;

const QUICK_ACTIONS = [] as const;

const MENU_SHORTCUTS = [
  {
    label: "My listings",
    description: "Track active and sold posts.",
    to: "/my-listings",
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
  {
    label: "Settings",
    description: "Manage your account and preferences.",
    to: "/settings",
    icon: User,
  },
] as const;

const getAvatarInitials = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return "BL";
  }
  const words = trimmed.replace(/[_-]+/g, " ").split(" ");
  const letters = words
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() ?? "");
  if (letters.length > 1) {
    return (letters[0] + letters[1]).slice(0, 2);
  }
  const fallback = trimmed.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2);
  return fallback ? fallback.toUpperCase() : trimmed.slice(0, 2).toUpperCase();
};

export const Header = (): JSX.Element => {
  const {
    user,
    isDowVerified,
    isAuthenticated,
    signOut,
    bases,
    currentBase,
    setCurrentBaseId,
    messageThreads,
  } = useBaseList();
  const { openSignIn } = useAuthDialog();
  const { settings } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isBaseSwitchOpen, setIsBaseSwitchOpen] = useState(false);
  const [baseSearch, setBaseSearch] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("theme") === "dark";
  });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [notificationFilter, setNotificationFilter] = useState<
    "all" | Notification["type"]
  >("all");

  useEffect(() => {
    const html = document.documentElement;
    if (isDarkMode) {
      html.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      html.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);

  // Load notifications when sidebar is opened
  useEffect(() => {
    if (!isNotificationsOpen || !isAuthenticated) return;

    const loadNotifications = async () => {
      try {
        const response = await notificationsApi.getNotifications(50, 0);
        setNotifications(response.notifications);
        setUnreadNotificationCount(response.unreadCount);
      } catch (error) {
        console.error("Error loading notifications:", error);
      }
    };

    // Load immediately
    loadNotifications();

    // Auto-refresh every 3 seconds when panel is open
    const interval = setInterval(loadNotifications, 3000);
    return () => clearInterval(interval);
  }, [isNotificationsOpen, isAuthenticated]);

  // Load initial unread count with faster polling for instant notifications
  useEffect(() => {
    if (!isAuthenticated) return;

    const loadUnreadCount = async () => {
      try {
        const response = await notificationsApi.getUnreadCount();
        setUnreadNotificationCount(
          typeof response?.unreadCount === "number" ? response.unreadCount : 0,
        );
      } catch (error) {
        console.error("Error loading notification count:", error);
        setUnreadNotificationCount(0);
      }
    };

    // Load immediately
    loadUnreadCount();

    // Refresh every 5 seconds for instant notifications
    const interval = setInterval(loadUnreadCount, 5000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const showAdminLink = user?.role === "admin";
  const avatarInitials = getAvatarInitials(user?.name ?? "");
  const verificationLabel = isDowVerified
    ? "Verified"
    : user.verificationStatus;
  const showSearch = isAuthenticated && location.pathname === "/";

  const unreadMessageCount = useMemo(() => {
    const threads = messageThreads || [];
    if (!user?.id) return 0;
    return threads.filter((thread) => {
      const lastReadAt = thread.lastReadAt?.[user.id];
      if (!lastReadAt) return thread.messages.length > 0;
      const lastMsg = thread.messages[thread.messages.length - 1];
      return lastMsg && new Date(lastMsg.sentAt) > new Date(lastReadAt);
    }).length;
  }, [messageThreads, user?.id]);

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

  const filteredBases = useMemo(() => {
    const query = baseSearch.trim().toLowerCase();
    if (!query) {
      return bases;
    }

    return bases.filter((base) => {
      const haystack =
        `${base.name} ${base.abbreviation} ${base.region}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [baseSearch, bases]);

  const filteredNotifications = useMemo(() => {
    if (notificationFilter === "all") {
      return notifications;
    }
    return notifications.filter((n) => n.type === notificationFilter);
  }, [notifications, notificationFilter]);

  const notificationCategories = useMemo(() => {
    const categories = new Map<Notification["type"] | "all", number>();
    categories.set("all", notifications.length);

    notifications.forEach((notif) => {
      categories.set(notif.type, (categories.get(notif.type) || 0) + 1);
    });

    return Array.from(categories.entries()).sort((a, b) => {
      if (a[0] === "all") return -1;
      if (b[0] === "all") return 1;
      return b[1] - a[1];
    });
  }, [notifications]);

  useEffect(() => {
    if (!isMenuOpen) {
      setBaseSearch("");
      return;
    }
    // Close notifications when menu opens
    if (isMenuOpen && isNotificationsOpen) {
      setIsNotificationsOpen(false);
    }
  }, [isMenuOpen, isNotificationsOpen]);

  const handleNavigate = (to: string) => {
    setMenuOpen(false);
    navigate(to);
  };

  const handleSwitchBase = (baseId: string) => {
    if (currentBase && baseId !== currentBase.id) {
      setCurrentBaseId(baseId);
    }
    setIsBaseSwitchOpen(false);
    setBaseSearch("");
  };

  const hasBaseQuery = baseSearch.trim().length > 0;

  if (!isAuthenticated) {
    return (
      <header className="sticky top-0 z-30 border-b border-nav-border bg-background/95 backdrop-blur-lg">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 md:py-5">
          <Logo />
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full p-2"
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              title={isDarkMode ? "Light mode" : "Dark mode"}
            >
              {isDarkMode ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              className="rounded-full px-4 py-2 text-sm font-semibold"
              type="button"
              onClick={openSignIn}
            >
              Sign In
            </Button>
            <Button
              asChild
              className="rounded-full px-5 py-2 text-sm font-semibold"
            >
              <a href="#join">Join Now</a>
            </Button>
          </div>
        </div>
      </header>
    );
  }

  return (
    <>
      <Sheet open={isMenuOpen} onOpenChange={setMenuOpen}>
        <header className="sticky top-0 z-50 border-b border-nav-border bg-background/95 backdrop-blur-lg">
          <div className="mx-auto w-full max-w-6xl px-4 py-3 md:py-5">
            <div className="flex flex-col gap-2 md:gap-4">
              <div className="flex items-center justify-between gap-2 md:gap-4">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex-shrink-0">
                    <Logo />
                  </div>
                  <div className="hidden md:flex flex-col gap-0">
                    <span className="text-[0.65rem] text-muted-foreground">
                      {settings.website_description ||
                        "Buy, Sell & Connect with Verified DoW Families"}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBaseSwitchOpen(true)}
                  className="hidden sm:flex flex-1 max-w-sm items-center gap-2 rounded-2xl border border-border bg-card px-3 md:px-4 py-2 md:py-3 text-left transition hover:border-primary/40 hover:bg-muted/50 flex-shrink-0"
                >
                  <MapPin
                    className="h-4 md:h-5 w-4 md:w-5 text-primary flex-shrink-0"
                    aria-hidden
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-xs md:text-sm text-foreground truncate">
                      {currentBase?.name || "Select Base"}
                    </p>
                    <p className="text-[0.6rem] md:text-[0.65rem] text-muted-foreground hidden md:block">
                      Switch base
                    </p>
                  </div>
                </button>
                <div className="flex items-center gap-1 md:gap-3 flex-shrink-0">
                  <div className="hidden md:flex flex-col items-end gap-0.5">
                    <p className="text-sm font-semibold text-foreground">
                      Welcome {user?.name || user?.username || "User"}!
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full p-1.5 md:p-2"
                    type="button"
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    title={isDarkMode ? "Light mode" : "Dark mode"}
                  >
                    {isDarkMode ? (
                      <Sun className="h-3.5 md:h-4 w-3.5 md:w-4" />
                    ) : (
                      <Moon className="h-3.5 md:h-4 w-3.5 md:w-4" />
                    )}
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsNotificationsOpen(!isNotificationsOpen);
                      if (isMenuOpen) {
                        setMenuOpen(false);
                      }
                    }}
                    className="relative flex h-9 md:h-11 w-9 md:w-11 items-center justify-center rounded-full border border-border bg-background shadow-soft transition hover:-translate-y-0.5 hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    title="Notifications"
                  >
                    <Bell
                      className="h-4 md:h-5 w-4 md:w-5 text-muted-foreground"
                      aria-hidden
                    />
                    {unreadNotificationCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[0.6rem] font-bold text-background shadow-sm">
                        {unreadNotificationCount > 9
                          ? "9+"
                          : unreadNotificationCount}
                      </span>
                    )}
                    <span className="sr-only">Notifications</span>
                  </button>
                  <SheetTrigger asChild>
                    <button
                      type="button"
                      className="relative flex h-9 md:h-11 w-9 md:w-11 items-center justify-center rounded-full border border-border bg-background shadow-soft transition hover:-translate-y-0.5 hover:shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      onClick={() => {
                        if (isNotificationsOpen) {
                          setIsNotificationsOpen(false);
                        }
                      }}
                    >
                      <Avatar className="h-7 md:h-9 w-7 md:w-9">
                        {user.avatarUrl ? (
                          <AvatarImage
                            src={user.avatarUrl}
                            alt={`${user.name} avatar`}
                          />
                        ) : (
                          <AvatarFallback className="text-xs md:text-sm font-semibold uppercase tracking-wide text-foreground">
                            {avatarInitials}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <span className="absolute -bottom-1 -right-1 flex h-3 md:h-4 w-3 md:w-4 items-center justify-center rounded-full bg-primary text-background shadow-sm">
                        <Menu className="h-2 md:h-3 w-2 md:w-3" aria-hidden />
                      </span>
                      <span className="sr-only">Open menu</span>
                    </button>
                  </SheetTrigger>
                </div>
              </div>
              <nav className="flex items-center justify-between gap-2 rounded-2xl border border-nav-border bg-nav/70 px-2 py-2 shadow-soft">
                {NAV_ITEMS.map(({ label, to, icon: Icon, end = false }) => {
                  // For Profile link, use the current user's username (fallback to userId if username is undefined)
                  const navTo =
                    label === "Profile" && user
                      ? `/profile/${user.username || user.userId}`
                      : to;

                  return (
                    <NavLink
                      key={label}
                      to={navTo}
                      end={end}
                      className={({ isActive }) =>
                        cn(
                          "flex flex-1 flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-wide transition",
                          isActive
                            ? "text-primary"
                            : "text-muted-foreground hover:text-foreground",
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span
                            className={cn(
                              "relative flex h-9 w-9 items-center justify-center rounded-full",
                              isActive
                                ? "bg-primary/10 text-primary"
                                : "bg-transparent",
                            )}
                          >
                            <Icon className="h-5 w-5" aria-hidden />
                            {label === "Messages" && unreadMessageCount > 0 && (
                              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[0.65rem] font-bold text-background shadow-sm">
                                {unreadMessageCount > 9
                                  ? "9+"
                                  : unreadMessageCount}
                              </span>
                            )}
                          </span>
                          {label}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </nav>
            </div>
            {showSearch ? (
              <div className="mt-3 w-full">
                <SearchInput />
              </div>
            ) : null}
          </div>
        </header>
        <SheetContent
          side="right"
          className="flex h-full w-full max-w-sm flex-col gap-6 bg-background p-6"
        >
          <SheetHeader className="items-start text-left">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                const profileRoute = user.username || user.userId;
                navigate(`/profile/${profileRoute}`);
              }}
              className="flex w-full items-center gap-3 rounded-lg transition hover:bg-muted/30 -m-2 p-2"
            >
              <Avatar className="h-12 w-12">
                {user.avatarUrl ? (
                  <AvatarImage
                    src={user.avatarUrl}
                    alt={`${user.name} avatar`}
                  />
                ) : (
                  <AvatarFallback className="text-base font-semibold uppercase tracking-wide text-foreground">
                    {avatarInitials}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="text-left">
                <SheetTitle className="text-xl font-semibold text-foreground">
                  {user.name}
                </SheetTitle>
                <SheetDescription className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ShieldCheck
                    className={cn(
                      "h-4 w-4",
                      isDowVerified ? "text-verified" : "text-warning",
                    )}
                    aria-hidden
                  />
                  {verificationLabel}
                </SheetDescription>
              </div>
            </button>
          </SheetHeader>
          <div className="space-y-4 overflow-y-auto">
            {currentBase && (
              <div className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                  Base
                </h3>
                <button
                  type="button"
                  onClick={() => setIsBaseSwitchOpen(true)}
                  className="flex w-full items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-left text-xs transition hover:bg-muted/50"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <MapPin className="h-3 w-3" aria-hidden />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">
                      {currentBase.name}
                    </p>
                    <p className="text-[0.65rem] text-muted-foreground truncate">
                      {currentBase.region}
                    </p>
                  </div>
                  <span className="text-[0.65rem] font-semibold text-primary">
                    Switch
                  </span>
                </button>
              </div>
            )}
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
                      <span className="text-sm font-semibold text-foreground">
                        {label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {description}
                      </span>
                    </span>
                  </button>
                ))}
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

      <Sheet open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
        <SheetContent
          side="right"
          className="flex h-full w-full max-w-sm flex-col gap-0 bg-background p-0"
        >
          <SheetHeader className="border-b border-border px-6 py-4">
            <SheetTitle className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5" aria-hidden />
                Notifications
              </div>
              {unreadNotificationCount > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs h-6"
                  onClick={async () => {
                    try {
                      await notificationsApi.markAllAsRead();
                      setNotifications(
                        notifications.map((n) => ({ ...n, read: true })),
                      );
                      setUnreadNotificationCount(0);
                      toast.success("All notifications marked as read");
                    } catch (error) {
                      console.error("Error marking all as read:", error);
                      toast.error("Failed to mark notifications as read");
                    }
                  }}
                >
                  Mark all as read
                </Button>
              )}
            </SheetTitle>
          </SheetHeader>
          {notifications.length > 0 && (
            <div className="border-b border-border px-4 py-3 flex gap-2 overflow-x-auto">
              {notificationCategories.map(([category, count]) => (
                <button
                  key={category}
                  type="button"
                  onClick={() =>
                    setNotificationFilter(
                      category as "all" | Notification["type"],
                    )
                  }
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition",
                    notificationFilter === category
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80",
                  )}
                >
                  {category === "all"
                    ? "All"
                    : category
                        .split("_")
                        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                        .join(" ")}
                  {count > 0 && (
                    <span className="ml-1 text-[0.65rem] font-semibold">
                      ({count})
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
          <div className="flex-1 overflow-y-auto">
            {isLoadingNotifications ? (
              <div className="flex items-center justify-center h-32">
                <p className="text-sm text-muted-foreground">
                  Loading notifications...
                </p>
              </div>
            ) : filteredNotifications.length > 0 ? (
              <div>
                {filteredNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onClick={() => {
                      // Close the notifications popover after clicking
                      setNotificationsOpen(false);
                    }}
                    onDismiss={(id) => {
                      setNotifications(
                        notifications.filter((n) => n.id !== id),
                      );
                      if (!notification.read) {
                        setUnreadNotificationCount(
                          Math.max(0, unreadNotificationCount - 1),
                        );
                      }
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                <Bell className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  {notificationFilter === "all"
                    ? "No notifications yet"
                    : `No ${notificationFilter.replace(/_/g, " ")} notifications`}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  We'll let you know when something interesting happens
                </p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={isBaseSwitchOpen} onOpenChange={setIsBaseSwitchOpen}>
        <DialogContent className="rounded-2xl max-w-sm max-h-[90vh] flex flex-col overflow-hidden p-0">
          <DialogHeader className="border-b border-border px-6 py-4">
            <DialogTitle>Switch base</DialogTitle>
          </DialogHeader>
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-6 py-4">
            <div className="relative flex-shrink-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                value={baseSearch}
                onChange={(event) => setBaseSearch(event.target.value)}
                placeholder="Search bases…"
                className="h-10 rounded-xl border-border bg-background pl-10"
              />
            </div>

            {baseSearch && filteredBases.length > 0 ? (
              <ul className="flex flex-1 flex-col gap-1 overflow-y-auto min-h-0">
                {filteredBases.map((base) => (
                  <li key={base.id}>
                    <button
                      type="button"
                      onClick={() => handleSwitchBase(base.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition",
                        currentBase && base.id === currentBase.id
                          ? "bg-primary/10 font-semibold text-primary"
                          : "text-foreground hover:bg-muted/50",
                      )}
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted/50 text-[0.65rem] flex-shrink-0">
                        <MapPin className="h-3.5 w-3.5" aria-hidden />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{base.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {base.region}
                        </p>
                      </div>
                      {currentBase && base.id === currentBase.id && (
                        <Check
                          className="h-4 w-4 text-primary flex-shrink-0"
                          aria-hidden
                        />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            ) : baseSearch ? (
              <p className="rounded-lg bg-muted/30 px-3 py-4 text-center text-sm text-muted-foreground">
                No bases match that search.
              </p>
            ) : null}
          </div>
          <div className="h-4 flex-shrink-0" />
        </DialogContent>
      </Dialog>
    </>
  );
};
