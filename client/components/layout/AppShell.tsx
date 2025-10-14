import { Outlet } from "react-router-dom";

import { BottomNav } from "@/components/navigation/BottomNav";
import { Header } from "@/components/layout/Header";

export const AppShell = (): JSX.Element => {
  return (
    <div className="relative flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 pb-32 pt-6 md:pb-24 md:pt-8">
          <Outlet />
        </div>
      </main>
      <BottomNav />
    </div>
  );
};
