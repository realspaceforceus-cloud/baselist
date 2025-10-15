import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./global.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/layout/AppShell";
import { BaseListProvider } from "@/context/BaseListContext";
import { AuthDialogProvider } from "@/context/AuthDialogContext";
import { SignInDialog } from "@/components/auth/SignInDialog";
import ListingDetail from "./pages/ListingDetail";
import Messages from "./pages/Messages";
import Moderation from "./pages/Moderation";
import NotFound from "./pages/NotFound";
import Post from "./pages/Post";
import Profile from "./pages/Profile";
import Home from "./pages/Home";
import AdminPanel from "./pages/AdminPanel";
import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";

const queryClient = new QueryClient();

const App = (): JSX.Element => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthDialogProvider>
          <BaseListProvider>
            <Routes>
              <Route element={<AppShell />}>
                <Route index element={<Home />} />
                <Route path="post" element={<Post />} />
                <Route path="messages" element={<Messages />} />
                <Route path="messages/:threadId" element={<Messages />} />
                <Route path="profile" element={<Profile />} />
                <Route path="profile/:memberId" element={<Profile />} />
                <Route path="moderation" element={<Moderation />} />
                <Route path="admin" element={<AdminPanel />} />
                <Route path="listing/:listingId" element={<ListingDetail />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
            <SignInDialog />
            <Toaster />
            <Sonner />
          </BaseListProvider>
        </AuthDialogProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
