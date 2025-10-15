import { Outlet as RouterOutlet } from "react-router-dom";

import { Outlet as RouterOutlet } from "react-router-dom";

import { BottomNav } from "@/components/navigation/BottomNav";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { useBaseList } from "@/context/BaseListContext";
import { cn } from "@/lib/utils";

export const AppShell = (): JSX.Element => {
  const { isAuthenticated } = useBaseList();

  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1">
        <div
          className={cn(
            "mx-auto w-full max-w-6xl px-4",
            isAuthenticated
              ? "pb-32 pt-6 md:pb-24 md:pt-8"
              : "pb-16 pt-12 md:pb-24 md:pt-20",
          )}
        >
          <RouterOutlet />
        </div>
      </main>
      <Footer />
      {isAuthenticated ? <BottomNav /> : null}
    </div>
  );
};
