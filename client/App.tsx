import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./global.css";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/layout/AppShell";
import { BaseListProvider } from "@/context/BaseListContext";
import { AuthDialogProvider } from "@/context/AuthDialogContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { SignInDialog } from "@/components/auth/SignInDialog";
import ListingDetail from "./pages/ListingDetail";
import Messages from "./pages/Messages";
import Moderation from "./pages/Moderation";
import MyListings from "./pages/MyListings";
import NotFound from "./pages/NotFound";
import Post from "./pages/Post";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import FAQ from "./pages/FAQ";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Guidelines from "./pages/Guidelines";
import Contact from "./pages/Contact";
import Home from "./pages/Home";
import Setup from "./pages/Setup";
import AdminPanel from "./pages/AdminPanel";
import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { useEffect, useState } from "react";

const queryClient = new QueryClient();

const AppContent = (): JSX.Element => {
  const [isSetupComplete, setIsSetupComplete] = useState<boolean | null>(null);

  useEffect(() => {
    // Check setup status
    fetch("/api/setup/status")
      .then((res) => res.json())
      .then((data) => {
        setIsSetupComplete(data.isSetupComplete);
      })
      .catch(() => {
        // If check fails, assume setup is not complete
        setIsSetupComplete(false);
      });
  }, []);

  // Loading state
  if (isSetupComplete === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Setup page - only accessible if setup not complete */}
      <Route path="setup" element={<Setup />} />

      {/* If setup is not complete, redirect to setup */}
      {!isSetupComplete && <Route path="*" element={<Navigate to="/setup" replace />} />}

      {/* Main app routes - only show if setup is complete */}
      {isSetupComplete && (
        <Route element={<AppShell />}>
          <Route index element={<Home />} />
          <Route path="post" element={<Post />} />
          <Route path="messages" element={<Messages />} />
          <Route path="messages/:threadId" element={<Messages />} />
          <Route path="my-listings" element={<MyListings />} />
          <Route path="profile" element={<Profile />} />
          <Route path="profile/:memberId" element={<Profile />} />
          <Route path="settings" element={<Settings />} />
          <Route path="moderation" element={<Moderation />} />
          <Route path="admin" element={<AdminPanel />} />
          <Route path="listing/:listingId" element={<ListingDetail />} />
          <Route path="faq" element={<FAQ />} />
          <Route path="terms" element={<Terms />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="guidelines" element={<Guidelines />} />
          <Route path="contact" element={<Contact />} />
        </Route>
      )}

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = (): JSX.Element => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthDialogProvider>
          <SettingsProvider>
            <BaseListProvider>
              <AppContent />
              <SignInDialog />
              <Toaster />
              <Sonner />
            </BaseListProvider>
          </SettingsProvider>
        </AuthDialogProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
