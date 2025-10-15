import { Outlet as RouterOutlet } from "react-router-dom";

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
              ? "pb-20 pt-4 md:pb-24 md:pt-8"
              : "pb-20 pt-12 md:pb-24 md:pt-20",
          )}
        >
          <RouterOutlet />
        </div>
      </main>
      <Footer />
    </div>
  );
};
