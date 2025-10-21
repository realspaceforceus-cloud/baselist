import { useEffect, useState } from "react";
import { Outlet as RouterOutlet } from "react-router-dom";

import { AnnouncementBanner } from "@/components/announcements/AnnouncementBanner";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/navigation/BottomNav";
import { useBaseList } from "@/context/BaseListContext";
import { cn } from "@/lib/utils";
import type { Announcement } from "@/types";

export const AppShell = (): JSX.Element => {
  const { isAuthenticated } = useBaseList();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        const response = await fetch("/api/announcements");
        if (response.ok) {
          const data = await response.json();
          const announcements = data.announcements || [];
          setAnnouncement(announcements.length > 0 ? announcements[0] : null);
        }
      } catch (error) {
        console.error("Failed to fetch announcement:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAnnouncement();

    // Poll for new announcements every 30 seconds
    const interval = setInterval(fetchAnnouncement, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      {!isLoading && <AnnouncementBanner announcement={announcement} />}
      <Header />
      <main className="flex-1">
        <div
          className={cn(
            "mx-auto w-full max-w-6xl px-4",
            isAuthenticated
              ? "pb-20 pt-4 md:pb-24 md:pt-8"
              : "pb-20 pt-12 md:pb-24 md:pt-20",
          )}
        >
          <RouterOutlet />
        </div>
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
};
